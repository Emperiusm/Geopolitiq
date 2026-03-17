import { Panel } from './Panel';
import { isDesktopRuntime, getApiBaseUrl } from '@/services/runtime';
import { t } from '../services/i18n';
import { loadFromStorage, saveToStorage } from '@/utils';
import { IDLE_PAUSE_MS, STORAGE_KEYS } from '@/config';
import { getStreamQuality } from '@/services/ai-flow-settings';
import { getLiveStreamsAlwaysOn, subscribeLiveStreamsSettingsChange } from '@/services/live-stream-settings';

// Re-export public API from extracted modules so existing consumers keep working.
export type { LiveChannel, StoredLiveChannels } from './live-news-types';
export {
  OPTIONAL_LIVE_CHANNELS,
  OPTIONAL_CHANNEL_REGIONS,
  BUILTIN_IDS,
  loadChannelsFromStorage,
  saveChannelsToStorage,
  getDefaultLiveChannels,
  getFilteredOptionalChannels,
  getFilteredChannelRegions,
} from './live-news-channels';

import type { LiveChannel, YouTubePlayer } from './live-news-types';
import {
  OPTIONAL_LIVE_CHANNELS,
  IDLE_ACTIVITY_EVENTS,
  loadChannelsFromStorage,
  saveChannelsToStorage,
  getDefaultLiveChannels,
} from './live-news-channels';
import {
  resolveYouTubeOrigin,
  getEmbedOrigin,
  getDirectHlsUrl,
  getProxiedHlsUrl,
  resolveChannelVideo,
  loadYouTubeApi,
  buildDesktopEmbedUrl,
  buildPlayerVars,
} from './live-news-player';
import {
  createOfflineMessage,
  createEmbedErrorMessage,
  createPlaceholderElement,
  createBotCheckPrompt,
  createNativeHlsVideoElement,
  createDesktopEmbedIframe,
  createChannelManagementModal,
  setupDragReorder,
  PAUSE_SVG, PLAY_SVG,
  MUTED_SVG, UNMUTED_SVG,
  FULLSCREEN_ENTER_SVG, FULLSCREEN_EXIT_SVG,
  SETTINGS_SVG,
} from './live-news-render';

export class LiveNewsPanel extends Panel {
  private channels: LiveChannel[] = [];
  private activeChannel!: LiveChannel;
  private channelSwitcher: HTMLElement | null = null;
  private isMuted = true;
  private isPlaying = true;
  private wasPlayingBeforeIdle = true;
  private muteBtn: HTMLButtonElement | null = null;
  private fullscreenBtn: HTMLButtonElement | null = null;
  private isFullscreen = false;
  private liveBtn: HTMLButtonElement | null = null;
  private idleTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly ECO_IDLE_PAUSE_MS = IDLE_PAUSE_MS;
  private boundVisibilityHandler!: () => void;
  private boundIdleResetHandler!: () => void;
  private idleDetectionEnabled = false;
  private alwaysOn = getLiveStreamsAlwaysOn();
  private unsubscribeStreamSettings: (() => void) | null = null;
  private player: YouTubePlayer | null = null;
  private playerContainer: HTMLDivElement | null = null;
  private playerElement: HTMLDivElement | null = null;
  private playerElementId: string;
  private isPlayerReady = false;
  private currentVideoId: string | null = null;
  private readonly youtubeOrigin: string | null;
  private forceFallbackVideoForNextInit = false;
  private useDesktopEmbedProxy = isDesktopRuntime();
  private desktopEmbedIframe: HTMLIFrameElement | null = null;
  private desktopEmbedRenderToken = 0;
  private suppressChannelClick = false;
  private boundMessageHandler!: (e: MessageEvent) => void;
  private muteSyncInterval: ReturnType<typeof setInterval> | null = null;
  private static readonly MUTE_SYNC_POLL_MS = 500;
  private botCheckTimeout: ReturnType<typeof setTimeout> | null = null;
  private static readonly BOT_CHECK_TIMEOUT_MS = 15_000;
  private nativeVideoElement: HTMLVideoElement | null = null;
  private hlsFailureCooldown = new Map<string, number>();
  private readonly HLS_COOLDOWN_MS = 5 * 60 * 1000;
  private deferredInit = false;
  private lazyObserver: IntersectionObserver | null = null;
  private idleCallbackId: number | ReturnType<typeof setTimeout> | null = null;
  constructor() {
    super({ id: 'live-news', title: t('panels.liveNews'), className: 'panel-wide', closable: true });
    this.insertLiveCountBadge(OPTIONAL_LIVE_CHANNELS.length);
    this.youtubeOrigin = resolveYouTubeOrigin();
    this.playerElementId = `live-news-player-${Date.now()}`;
    this.channels = loadChannelsFromStorage();
    if (this.channels.length === 0) this.channels = getDefaultLiveChannels();
    const savedChannelId = loadFromStorage<string>(STORAGE_KEYS.activeChannel, '');
    const savedChannel = savedChannelId ? this.channels.find(c => c.id === savedChannelId) : null;
    this.activeChannel = savedChannel ?? this.channels[0]!;
    this.createLiveButton();
    this.createMuteButton();
    this.createChannelSwitcher();
    this.setupBridgeMessageListener();
    this.renderPlaceholder();
    this.setupLazyInit();
    this.setupIdleDetection();
    this.unsubscribeStreamSettings = subscribeLiveStreamsSettingsChange((alwaysOn) => {
      this.alwaysOn = alwaysOn;
      this.applyIdleMode();
    });
    document.addEventListener('keydown', this.boundFullscreenEscHandler);
  }
  private hlsUrl(channelId: string): string | undefined {
    return getDirectHlsUrl(channelId, this.hlsFailureCooldown, this.HLS_COOLDOWN_MS)
      || getProxiedHlsUrl(channelId, this.hlsFailureCooldown, this.HLS_COOLDOWN_MS);
  }
  private get embedOrigin(): string { return getEmbedOrigin(); }
  // ── Lazy / deferred init ─────────────────────────────────────────────
  private renderPlaceholder(): void {
    this.content.innerHTML = '';
    this.content.appendChild(createPlaceholderElement(this.activeChannel.name, () => this.triggerInit()));
  }
  private setupLazyInit(): void {
    this.lazyObserver = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) {
        this.lazyObserver?.disconnect();
        this.lazyObserver = null;
        if ('requestIdleCallback' in window) {
          this.idleCallbackId = (window as any).requestIdleCallback(
            () => { this.idleCallbackId = null; this.triggerInit(); }, { timeout: 1000 });
        } else {
          this.idleCallbackId = setTimeout(() => { this.idleCallbackId = null; this.triggerInit(); }, 1000);
        }
      }
    }, { threshold: 0.1 });
    this.lazyObserver.observe(this.element);
  }
  private triggerInit(): void {
    if (this.deferredInit) return;
    this.deferredInit = true;
    if (this.lazyObserver) { this.lazyObserver.disconnect(); this.lazyObserver = null; }
    if (this.idleCallbackId !== null) {
      if ('cancelIdleCallback' in window) (window as any).cancelIdleCallback(this.idleCallbackId);
      else clearTimeout(this.idleCallbackId as ReturnType<typeof setTimeout>);
      this.idleCallbackId = null;
    }
    this.ensurePlayerContainer();
    void this.initializePlayer();
  }
  // ── Idle detection ───────────────────────────────────────────────────
  private applyIdleMode(): void {
    if (this.alwaysOn) {
      if (this.idleTimeout) { clearTimeout(this.idleTimeout); this.idleTimeout = null; }
      if (this.idleDetectionEnabled) {
        IDLE_ACTIVITY_EVENTS.forEach(ev => document.removeEventListener(ev, this.boundIdleResetHandler));
        this.idleDetectionEnabled = false;
      }
      if (!document.hidden) this.resumeFromIdle();
      return;
    }
    if (!this.idleDetectionEnabled) {
      IDLE_ACTIVITY_EVENTS.forEach(ev => document.addEventListener(ev, this.boundIdleResetHandler, { passive: true }));
      this.idleDetectionEnabled = true;
    }
    this.boundIdleResetHandler();
  }
  private setupIdleDetection(): void {
    this.boundVisibilityHandler = () => {
      if (document.hidden) { if (this.idleTimeout) clearTimeout(this.idleTimeout); }
      else { this.resumeFromIdle(); this.applyIdleMode(); }
    };
    document.addEventListener('visibilitychange', this.boundVisibilityHandler);
    this.boundIdleResetHandler = () => {
      if (this.alwaysOn) return;
      if (this.idleTimeout) clearTimeout(this.idleTimeout);
      this.resumeFromIdle();
      this.idleTimeout = setTimeout(() => this.pauseForIdle(), this.ECO_IDLE_PAUSE_MS);
    };
    this.applyIdleMode();
  }
  private pauseForIdle(): void {
    if (this.isPlaying) { this.wasPlayingBeforeIdle = true; this.isPlaying = false; this.updateLiveIndicator(); }
    this.destroyPlayer();
  }
  private resumeFromIdle(): void {
    if (this.wasPlayingBeforeIdle && !this.isPlaying) {
      this.isPlaying = true; this.updateLiveIndicator(); void this.initializePlayer();
    }
  }
  // ── Mute sync ────────────────────────────────────────────────────────
  private stopMuteSyncPolling(): void {
    if (this.muteSyncInterval !== null) { clearInterval(this.muteSyncInterval); this.muteSyncInterval = null; }
  }
  private startMuteSyncPolling(): void {
    this.stopMuteSyncPolling();
    this.muteSyncInterval = setInterval(() => this.syncMuteStateFromPlayer(), LiveNewsPanel.MUTE_SYNC_POLL_MS);
  }
  private syncMuteStateFromPlayer(): void {
    if (this.useDesktopEmbedProxy || !this.player || !this.isPlayerReady) return;
    const p = this.player as { getVolume?(): number; isMuted?(): boolean };
    const muted = typeof p.isMuted === 'function' ? p.isMuted() : (p.getVolume?.() === 0);
    if (typeof muted === 'boolean' && muted !== this.isMuted) { this.isMuted = muted; this.updateMuteIcon(); }
  }
  // ── Player lifecycle ─────────────────────────────────────────────────
  private destroyPlayer(): void {
    this.clearBotCheckTimeout();
    this.stopMuteSyncPolling();
    if (this.player) { if (typeof this.player.destroy === 'function') this.player.destroy(); this.player = null; }
    if (this.nativeVideoElement) {
      this.nativeVideoElement.pause(); this.nativeVideoElement.removeAttribute('src');
      this.nativeVideoElement.load(); this.nativeVideoElement = null;
    }
    this.desktopEmbedIframe = null; this.desktopEmbedRenderToken += 1;
    this.isPlayerReady = false; this.currentVideoId = null;
    if (this.playerContainer) {
      this.playerContainer.innerHTML = '';
      if (!this.useDesktopEmbedProxy) {
        this.playerElement = document.createElement('div'); this.playerElement.id = this.playerElementId;
        this.playerContainer.appendChild(this.playerElement);
      } else { this.playerElement = null; }
    }
  }
  private ensurePlayerContainer(): void {
    this.deferredInit = true; this.content.innerHTML = '';
    this.playerContainer = document.createElement('div'); this.playerContainer.className = 'live-news-player';
    if (!this.useDesktopEmbedProxy) {
      this.playerElement = document.createElement('div'); this.playerElement.id = this.playerElementId;
      this.playerContainer.appendChild(this.playerElement);
    } else { this.playerElement = null; }
    this.content.appendChild(this.playerContainer);
  }
  // ── Header buttons ───────────────────────────────────────────────────
  private createLiveButton(): void {
    this.liveBtn = document.createElement('button');
    this.liveBtn.className = 'live-mute-btn'; this.liveBtn.title = 'Toggle playback';
    this.updateLiveIndicator();
    this.liveBtn.addEventListener('click', (e) => { e.stopPropagation(); this.togglePlayback(); });
  }
  private updateLiveIndicator(): void { if (this.liveBtn) this.liveBtn.innerHTML = this.isPlaying ? PAUSE_SVG : PLAY_SVG; }
  private togglePlayback(): void {
    this.isPlaying = !this.isPlaying; this.wasPlayingBeforeIdle = this.isPlaying; this.updateLiveIndicator();
    if (this.isPlaying && !this.player && !this.desktopEmbedIframe && !this.nativeVideoElement) {
      this.ensurePlayerContainer(); void this.initializePlayer();
    } else { this.syncPlayerState(); }
  }
  private createMuteButton(): void {
    this.muteBtn = document.createElement('button');
    this.muteBtn.className = 'live-mute-btn'; this.muteBtn.title = 'Toggle sound';
    this.updateMuteIcon();
    this.muteBtn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleMute(); });
    const header = this.element.querySelector('.panel-header');
    if (this.liveBtn) header?.appendChild(this.liveBtn);
    header?.appendChild(this.muteBtn);
    this.createFullscreenButton();
  }
  private createFullscreenButton(): void {
    this.fullscreenBtn = document.createElement('button');
    this.fullscreenBtn.className = 'live-mute-btn'; this.fullscreenBtn.title = 'Fullscreen';
    this.fullscreenBtn.innerHTML = FULLSCREEN_ENTER_SVG;
    this.fullscreenBtn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleFullscreen(); });
    this.element.querySelector('.panel-header')?.appendChild(this.fullscreenBtn);
  }
  private toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
    this.element.classList.toggle('live-news-fullscreen', this.isFullscreen);
    document.body.classList.toggle('live-news-fullscreen-active', this.isFullscreen);
    if (this.fullscreenBtn) {
      this.fullscreenBtn.title = this.isFullscreen ? 'Exit fullscreen' : 'Fullscreen';
      this.fullscreenBtn.innerHTML = this.isFullscreen ? FULLSCREEN_EXIT_SVG : FULLSCREEN_ENTER_SVG;
    }
  }
  private boundFullscreenEscHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.isFullscreen) this.toggleFullscreen();
  };
  private updateMuteIcon(): void {
    if (!this.muteBtn) return;
    this.muteBtn.innerHTML = this.isMuted ? MUTED_SVG : UNMUTED_SVG;
    this.muteBtn.classList.toggle('unmuted', !this.isMuted);
  }
  private toggleMute(): void { this.isMuted = !this.isMuted; this.updateMuteIcon(); this.syncPlayerState(); }
  // ── Channel switcher ─────────────────────────────────────────────────
  private createChannelButton(channel: LiveChannel): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = `live-channel-btn ${channel.id === this.activeChannel.id ? 'active' : ''}`;
    btn.dataset.channelId = channel.id; btn.textContent = channel.name; btn.style.cursor = 'grab';
    btn.addEventListener('click', (e) => {
      if (this.suppressChannelClick) { e.preventDefault(); e.stopPropagation(); return; }
      e.preventDefault(); this.switchChannel(channel);
    });
    return btn;
  }
  private createChannelSwitcher(): void {
    this.channelSwitcher = document.createElement('div');
    this.channelSwitcher.className = 'live-news-switcher';
    for (const ch of this.channels) this.channelSwitcher.appendChild(this.createChannelButton(ch));
    setupDragReorder(this.channelSwitcher, {
      onReorder: () => this.applyChannelOrderFromDom(),
      getSuppressClick: () => this.suppressChannelClick,
      setSuppressClick: (v) => { this.suppressChannelClick = v; },
    });
    const toolbar = document.createElement('div');
    toolbar.className = 'live-news-toolbar';
    toolbar.appendChild(this.channelSwitcher);
    this.createManageButton(toolbar);
    this.element.insertBefore(toolbar, this.content);
  }
  private createManageButton(toolbar: HTMLElement): void {
    const openBtn = document.createElement('button');
    openBtn.type = 'button'; openBtn.className = 'live-news-settings-btn';
    openBtn.title = t('components.liveNews.channelSettings') ?? 'Channel Settings';
    openBtn.innerHTML = SETTINGS_SVG;
    openBtn.addEventListener('click', () => this.openChannelManagementModal());
    toolbar.appendChild(openBtn);
  }
  private openChannelManagementModal(): void {
    if (document.querySelector('.live-channels-modal-overlay')) return;
    const { overlay, container } = createChannelManagementModal(() => this.refreshChannelsFromStorage());
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));
    import('@/live-channels-window').then(async ({ initLiveChannelsWindow }) => {
      await initLiveChannelsWindow(container);
    }).catch(console.error);
  }
  private refreshChannelSwitcher(): void {
    if (!this.channelSwitcher) return;
    this.channelSwitcher.innerHTML = '';
    for (const ch of this.channels) this.channelSwitcher.appendChild(this.createChannelButton(ch));
  }
  private applyChannelOrderFromDom(): void {
    if (!this.channelSwitcher) return;
    const ids = Array.from(this.channelSwitcher.querySelectorAll<HTMLElement>('.live-channel-btn'))
      .map(el => el.dataset.channelId).filter((id): id is string => !!id);
    const orderMap = new Map(this.channels.map(c => [c.id, c]));
    this.channels = ids.map(id => orderMap.get(id)).filter((c): c is LiveChannel => !!c);
    saveChannelsToStorage(this.channels);
  }
  // ── Channel switching ────────────────────────────────────────────────
  private async switchChannel(channel: LiveChannel): Promise<void> {
    if (channel.id === this.activeChannel.id) return;
    this.activeChannel = channel;
    saveToStorage(STORAGE_KEYS.activeChannel, channel.id);
    this.channelSwitcher?.querySelectorAll('.live-channel-btn').forEach(btn => {
      const el = btn as HTMLElement;
      el.classList.toggle('active', el.dataset.channelId === channel.id);
      if (el.dataset.channelId === channel.id) el.classList.add('loading');
    });
    await resolveChannelVideo(channel, false, this.hlsFailureCooldown, this.HLS_COOLDOWN_MS);
    if (!this.element?.isConnected) return;
    this.channelSwitcher?.querySelectorAll('.live-channel-btn').forEach(btn => {
      const el = btn as HTMLElement; el.classList.remove('loading');
      if (el.dataset.channelId === channel.id && !channel.videoId) el.classList.add('offline');
    });
    if (this.hlsUrl(channel.id)) { this.renderNativeHlsPlayer(); return; }
    if (!channel.videoId || !/^[\w-]{10,12}$/.test(channel.videoId)) { this.showOfflineMessage(channel); return; }
    if (this.useDesktopEmbedProxy) { this.renderDesktopEmbed(true); return; }
    if (!this.player) { this.ensurePlayerContainer(); void this.initializePlayer(); return; }
    this.syncPlayerState();
  }
  private showOfflineMessage(channel: LiveChannel): void {
    this.destroyPlayer(); this.content.innerHTML = createOfflineMessage(channel);
  }
  private showEmbedError(channel: LiveChannel, errorCode: number): void {
    this.destroyPlayer(); this.content.innerHTML = createEmbedErrorMessage(channel, errorCode);
  }
  // ── Bridge message handler ───────────────────────────────────────────
  private setupBridgeMessageListener(): void {
    this.boundMessageHandler = (e: MessageEvent) => {
      if (e.source !== this.desktopEmbedIframe?.contentWindow) return;
      const localOrigin = getApiBaseUrl();
      if (e.origin !== this.embedOrigin && (!localOrigin || e.origin !== localOrigin)) return;
      const msg = e.data;
      if (!msg || typeof msg !== 'object' || !msg.type) return;
      if (msg.type === 'yt-ready') {
        this.clearBotCheckTimeout(); this.isPlayerReady = true; this.syncDesktopEmbedState();
      } else if (msg.type === 'yt-error') {
        this.clearBotCheckTimeout();
        const code = Number(msg.code ?? 0);
        if (code === 153 && this.activeChannel.fallbackVideoId &&
          this.activeChannel.videoId !== this.activeChannel.fallbackVideoId) {
          this.activeChannel.videoId = this.activeChannel.fallbackVideoId; this.renderDesktopEmbed(true);
        } else { this.showEmbedError(this.activeChannel, code); }
      } else if (msg.type === 'yt-mute-state') {
        const muted = msg.muted === true;
        if (this.isMuted !== muted) { this.isMuted = muted; this.updateMuteIcon(); }
      }
    };
    window.addEventListener('message', this.boundMessageHandler);
  }
  // ── Desktop embed ────────────────────────────────────────────────────
  private postToEmbed(msg: Record<string, unknown>): void {
    if (!this.desktopEmbedIframe?.contentWindow) return;
    this.desktopEmbedIframe.contentWindow.postMessage(msg, this.embedOrigin);
  }
  private syncDesktopEmbedState(): void {
    this.postToEmbed({ type: this.isPlaying ? 'play' : 'pause' });
    this.postToEmbed({ type: this.isMuted ? 'mute' : 'unmute' });
  }
  private renderDesktopEmbed(force = false): void {
    if (!this.useDesktopEmbedProxy) return;
    void this.renderDesktopEmbedAsync(force);
  }
  private async renderDesktopEmbedAsync(force = false): Promise<void> {
    const videoId = this.activeChannel.videoId;
    if (!videoId) { this.showOfflineMessage(this.activeChannel); return; }
    if (!force && this.currentVideoId === videoId && this.desktopEmbedIframe) { this.syncDesktopEmbedState(); return; }
    const renderToken = ++this.desktopEmbedRenderToken;
    this.currentVideoId = videoId; this.isPlayerReady = true;
    if (!this.playerContainer?.parentElement) this.ensurePlayerContainer();
    if (!this.playerContainer) return;
    this.playerContainer.innerHTML = '';
    const embedUrl = buildDesktopEmbedUrl(videoId, this.isPlaying, this.isMuted, this.youtubeOrigin);
    if (renderToken !== this.desktopEmbedRenderToken) return;
    const iframe = createDesktopEmbedIframe(embedUrl, this.activeChannel.name);
    this.playerContainer.appendChild(iframe);
    this.desktopEmbedIframe = iframe;
    this.startBotCheckTimeout();
  }
  // ── Native HLS player ───────────────────────────────────────────────
  private renderNativeHlsPlayer(): void {
    const url = this.hlsUrl(this.activeChannel.id);
    if (!url || !(url.startsWith('https://') || url.startsWith('http://127.0.0.1'))) return;
    this.destroyPlayer(); this.ensurePlayerContainer();
    if (!this.playerContainer) return;
    this.playerContainer.innerHTML = '';
    const video = createNativeHlsVideoElement(url, this.isPlaying, this.isMuted);
    const failedChannel = this.activeChannel;
    video.addEventListener('error', () => {
      video.pause(); video.removeAttribute('src'); this.nativeVideoElement = null;
      this.hlsFailureCooldown.set(failedChannel.id, Date.now()); failedChannel.hlsUrl = undefined;
      if (this.activeChannel.id === failedChannel.id) { this.ensurePlayerContainer(); void this.initializePlayer(); }
    });
    video.addEventListener('volumechange', () => {
      if (!this.nativeVideoElement) return;
      const muted = this.nativeVideoElement.muted || this.nativeVideoElement.volume === 0;
      if (muted !== this.isMuted) { this.isMuted = muted; this.updateMuteIcon(); }
    });
    video.addEventListener('pause', () => { if (this.nativeVideoElement && this.isPlaying) { this.isPlaying = false; this.updateLiveIndicator(); } });
    video.addEventListener('play', () => { if (this.nativeVideoElement && !this.isPlaying) { this.isPlaying = true; this.updateLiveIndicator(); } });
    this.nativeVideoElement = video; this.playerContainer.appendChild(video);
    this.isPlayerReady = true; this.currentVideoId = this.activeChannel.videoId || null;
    if (this.isPlaying) {
      const wantUnmute = !this.isMuted; video.muted = true;
      video.play()?.then(() => { if (wantUnmute && this.nativeVideoElement === video) video.muted = false; }).catch(() => {});
    }
  }
  private syncNativeVideoState(): void {
    if (!this.nativeVideoElement) return;
    this.nativeVideoElement.muted = this.isMuted;
    if (this.isPlaying) this.nativeVideoElement.play()?.catch(() => {}); else this.nativeVideoElement.pause();
  }
  // ── YouTube JS API player ────────────────────────────────────────────
  private async initializePlayer(): Promise<void> {
    if (!this.useDesktopEmbedProxy && !this.nativeVideoElement && this.player) return;
    const useFallback = this.activeChannel.useFallbackOnly || this.forceFallbackVideoForNextInit;
    this.forceFallbackVideoForNextInit = false;
    await resolveChannelVideo(this.activeChannel, useFallback, this.hlsFailureCooldown, this.HLS_COOLDOWN_MS);
    if (!this.element?.isConnected) return;
    if (this.hlsUrl(this.activeChannel.id)) { this.renderNativeHlsPlayer(); return; }
    if (!this.activeChannel.videoId || !/^[\w-]{10,12}$/.test(this.activeChannel.videoId)) {
      this.showOfflineMessage(this.activeChannel); return;
    }
    if (this.useDesktopEmbedProxy) { this.renderDesktopEmbed(true); return; }
    await loadYouTubeApi();
    if (!this.element?.isConnected || this.player || !this.playerElement || !window.YT?.Player) return;
    // Observe for iframe to add storage-access permission
    const obs = new MutationObserver((muts) => {
      for (const m of muts) for (const n of m.addedNodes) {
        if (n instanceof HTMLIFrameElement && n.src.includes('youtube.com')) {
          const cur = n.getAttribute('allow') || '';
          if (!cur.includes('storage-access')) n.setAttribute('allow', cur ? `${cur}; storage-access` : 'storage-access');
          obs.disconnect(); if (obsTimer !== null) clearTimeout(obsTimer); return;
        }
      }
    });
    let obsTimer: ReturnType<typeof setTimeout> | null = null;
    if (this.playerContainer) {
      obs.observe(this.playerContainer, { childList: true, subtree: true });
      obsTimer = setTimeout(() => obs.disconnect(), 10_000);
    }
    try {
      this.player = new window.YT!.Player(this.playerElementId, {
        host: 'https://www.youtube.com',
        videoId: this.activeChannel.videoId,
        playerVars: buildPlayerVars(this.isPlaying, this.isMuted, this.youtubeOrigin),
        events: {
          onReady: () => {
            this.clearBotCheckTimeout(); this.isPlayerReady = true;
            this.currentVideoId = this.activeChannel.videoId || null;
            const iframe = this.player?.getIframe?.();
            if (iframe) iframe.referrerPolicy = 'strict-origin-when-cross-origin';
            const q = getStreamQuality(); if (q !== 'auto') this.player?.setPlaybackQuality?.(q);
            this.syncPlayerState(); this.startMuteSyncPolling();
          },
          onError: (event) => {
            this.clearBotCheckTimeout();
            const code = Number(event?.data ?? 0);
            if (code === 153 && this.activeChannel.fallbackVideoId &&
              this.activeChannel.videoId !== this.activeChannel.fallbackVideoId) {
              this.destroyPlayer(); this.forceFallbackVideoForNextInit = true;
              this.ensurePlayerContainer(); void this.initializePlayer(); return;
            }
            if (code === 153 && isDesktopRuntime()) {
              this.useDesktopEmbedProxy = true; this.destroyPlayer();
              this.ensurePlayerContainer(); this.renderDesktopEmbed(true); return;
            }
            this.destroyPlayer(); this.showEmbedError(this.activeChannel, code);
          },
        },
      });
    } catch (err) { obs.disconnect(); if (obsTimer !== null) clearTimeout(obsTimer); throw err; }
    this.startBotCheckTimeout();
  }
  // ── Bot-check ────────────────────────────────────────────────────────
  private startBotCheckTimeout(): void {
    this.clearBotCheckTimeout();
    this.botCheckTimeout = setTimeout(() => {
      this.botCheckTimeout = null; if (!this.isPlayerReady) this.showBotCheckPrompt();
    }, LiveNewsPanel.BOT_CHECK_TIMEOUT_MS);
  }
  private clearBotCheckTimeout(): void {
    if (this.botCheckTimeout) { clearTimeout(this.botCheckTimeout); this.botCheckTimeout = null; }
  }
  private showBotCheckPrompt(): void {
    this.destroyPlayer(); this.content.innerHTML = '';
    this.content.appendChild(createBotCheckPrompt(
      this.activeChannel,
      () => this.openYouTubeSignIn(),
      () => { this.ensurePlayerContainer(); if (this.useDesktopEmbedProxy) this.renderDesktopEmbed(true); else void this.initializePlayer(); },
    ));
  }
  private async openYouTubeSignIn(): Promise<void> {
    const url = 'https://accounts.google.com/ServiceLogin?service=youtube&continue=https://www.youtube.com/';
    if (isDesktopRuntime()) {
      try { const { tryInvokeTauri } = await import('@/services/tauri-bridge'); await tryInvokeTauri('open_youtube_login'); }
      catch { window.open(url, '_blank'); }
    } else { window.open(url, '_blank'); }
  }
  // ── Player state sync ───────────────────────────────────────────────
  private syncPlayerState(): void {
    if (this.nativeVideoElement) {
      const vid = this.activeChannel.videoId;
      if (vid && this.currentVideoId !== vid) void this.initializePlayer(); else this.syncNativeVideoState();
      return;
    }
    if (this.useDesktopEmbedProxy) {
      const vid = this.activeChannel.videoId;
      if (vid && this.currentVideoId !== vid) this.renderDesktopEmbed(true); else this.syncDesktopEmbedState();
      return;
    }
    if (!this.player || !this.isPlayerReady) return;
    const videoId = this.activeChannel.videoId; if (!videoId) return;
    const isNewVideo = this.currentVideoId !== videoId;
    if (isNewVideo) {
      this.currentVideoId = videoId;
      if (!this.playerElement || !document.getElementById(this.playerElementId)) {
        this.ensurePlayerContainer(); void this.initializePlayer(); return;
      }
      if (this.isPlaying) this.player.loadVideoById?.(videoId); else this.player.cueVideoById?.(videoId);
    }
    if (this.isMuted) this.player.mute?.(); else this.player.unMute?.();
    if (this.isPlaying) {
      if (isNewVideo) {
        this.player.pauseVideo?.();
        setTimeout(() => {
          if (this.player && this.isPlaying) {
            this.player.mute?.(); this.player.playVideo?.();
            if (!this.isMuted) setTimeout(() => { this.player?.unMute?.(); }, 500);
          }
        }, 800);
      } else { this.player.playVideo?.(); }
    } else { this.player.pauseVideo?.(); }
  }
  // ── Public API ───────────────────────────────────────────────────────
  public refresh(): void { this.syncPlayerState(); }
  public refreshChannelsFromStorage(): void {
    this.channels = loadChannelsFromStorage();
    if (this.channels.length === 0) this.channels = getDefaultLiveChannels();
    if (!this.channels.some(c => c.id === this.activeChannel.id)) {
      this.activeChannel = this.channels[0]!; void this.switchChannel(this.activeChannel);
    }
    this.refreshChannelSwitcher();
  }
  public destroy(): void {
    this.destroyPlayer();
    this.unsubscribeStreamSettings?.(); this.unsubscribeStreamSettings = null;
    if (this.lazyObserver) { this.lazyObserver.disconnect(); this.lazyObserver = null; }
    if (this.idleCallbackId !== null) {
      if ('cancelIdleCallback' in window) (window as any).cancelIdleCallback(this.idleCallbackId);
      else clearTimeout(this.idleCallbackId as ReturnType<typeof setTimeout>);
      this.idleCallbackId = null;
    }
    if (this.idleTimeout) { clearTimeout(this.idleTimeout); this.idleTimeout = null; }
    document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
    document.removeEventListener('keydown', this.boundFullscreenEscHandler);
    window.removeEventListener('message', this.boundMessageHandler);
    if (this.isFullscreen) this.toggleFullscreen();
    if (this.idleDetectionEnabled) {
      IDLE_ACTIVITY_EVENTS.forEach(ev => document.removeEventListener(ev, this.boundIdleResetHandler));
      this.idleDetectionEnabled = false;
    }
    this.playerContainer = null;
    super.destroy();
  }
}
