import { fetchLiveVideoInfo } from '@/services/live-news';
import { isDesktopRuntime, getRemoteApiBaseUrl, getApiBaseUrl, getLocalApiPort } from '@/services/runtime';
import { getStreamQuality } from '@/services/ai-flow-settings';
import { SITE_VARIANT } from '@/config';
import { DIRECT_HLS_MAP, PROXIED_HLS_MAP } from './live-news-channels';
import type { LiveChannel, YouTubePlayer } from './live-news-types';

/** Resolve the origin to pass to YouTube embed to avoid embed restrictions. */
export function resolveYouTubeOrigin(): string | null {
  const fallbackOrigin = SITE_VARIANT === 'tech'
    ? 'https://worldmonitor.app'
    : 'https://worldmonitor.app';

  try {
    const { protocol, origin, host } = window.location;
    if (protocol === 'http:' || protocol === 'https:') {
      // Desktop webviews commonly run from tauri.localhost which can trigger
      // YouTube embed restrictions. Use canonical public origin instead.
      if (host === 'tauri.localhost' || host.endsWith('.tauri.localhost')) {
        return fallbackOrigin;
      }
      return origin;
    }
    if (protocol === 'tauri:' || protocol === 'asset:') {
      return fallbackOrigin;
    }
  } catch {
    // Ignore invalid location values.
  }
  return fallbackOrigin;
}

/** Compute the embed origin for desktop/web bridge iframe. */
export function getEmbedOrigin(): string {
  if (isDesktopRuntime()) return `http://localhost:${getLocalApiPort()}`;
  try { return new URL(getRemoteApiBaseUrl()).origin; } catch { return 'https://worldmonitor.app'; }
}

/** Get the direct HLS URL for a channel, respecting cooldown map. */
export function getDirectHlsUrl(channelId: string, hlsFailureCooldown: Map<string, number>, cooldownMs: number): string | undefined {
  const url = DIRECT_HLS_MAP[channelId];
  if (!url) return undefined;
  const failedAt = hlsFailureCooldown.get(channelId);
  if (failedAt && Date.now() - failedAt < cooldownMs) return undefined;
  return url;
}

/** Get the proxied HLS URL for a channel (desktop only), respecting cooldown map. */
export function getProxiedHlsUrl(channelId: string, hlsFailureCooldown: Map<string, number>, cooldownMs: number): string | undefined {
  if (!isDesktopRuntime()) return undefined;
  const entry = PROXIED_HLS_MAP[channelId];
  if (!entry) return undefined;
  const failedAt = hlsFailureCooldown.get(channelId);
  if (failedAt && Date.now() - failedAt < cooldownMs) return undefined;
  return `http://127.0.0.1:${getLocalApiPort()}/api/hls-proxy?url=${encodeURIComponent(entry.url)}`;
}

/** Resolve the video ID / HLS URL for a channel. Mutates the channel object. */
export async function resolveChannelVideo(
  channel: LiveChannel,
  forceFallback: boolean,
  hlsFailureCooldown: Map<string, number>,
  cooldownMs: number,
): Promise<void> {
  const useFallbackVideo = channel.useFallbackOnly || forceFallback;

  if (getDirectHlsUrl(channel.id, hlsFailureCooldown, cooldownMs) || getProxiedHlsUrl(channel.id, hlsFailureCooldown, cooldownMs)) {
    channel.videoId = channel.fallbackVideoId;
    channel.isLive = true;
    return;
  }

  if (useFallbackVideo) {
    channel.videoId = channel.fallbackVideoId;
    channel.isLive = false;
    channel.hlsUrl = undefined;
    return;
  }

  // Skip fetchLiveVideoInfo for channels without handle (HLS-only)
  if (!channel.handle) {
    channel.videoId = channel.fallbackVideoId;
    channel.isLive = false;
    return;
  }

  const info = await fetchLiveVideoInfo(channel.handle);
  channel.videoId = info.videoId || channel.fallbackVideoId;
  channel.isLive = !!info.videoId;
  channel.hlsUrl = info.hlsUrl || undefined;
}

let apiPromise: Promise<void> | null = null;

/** Load the YouTube IFrame Player API script. Returns a promise that resolves when the API is ready. */
export function loadYouTubeApi(): Promise<void> {
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-youtube-iframe-api="true"]',
    );

    if (existingScript) {
      if (window.YT?.Player) {
        resolve();
        return;
      }
      const previousReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previousReady?.();
        resolve();
      };
      return;
    }

    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      resolve();
    };

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.dataset.youtubeIframeApi = 'true';
    script.onerror = () => {
      console.warn('[LiveNews] YouTube IFrame API failed to load (ad blocker or network issue)');
      apiPromise = null;
      script.remove();
      resolve();
    };
    document.head.appendChild(script);
  });

  return apiPromise;
}

/** Build the desktop embed URL for a given video ID. */
export function buildDesktopEmbedUrl(
  videoId: string,
  isPlaying: boolean,
  isMuted: boolean,
  youtubeOrigin: string | null,
): string {
  const quality = getStreamQuality();
  const params = new URLSearchParams({
    videoId,
    autoplay: isPlaying ? '1' : '0',
    mute: isMuted ? '1' : '0',
  });
  if (quality !== 'auto') params.set('vq', quality);
  // origin = canonical site origin YouTube trusts for embed restrictions.
  // parentOrigin = actual parent frame origin so postMessage round-trips work.
  params.set('origin', youtubeOrigin || 'https://worldmonitor.app');
  params.set('parentOrigin', window.location.origin);
  return `http://localhost:${getLocalApiPort()}/api/youtube-embed?${params.toString()}`;
}

/** Build the YouTube JS API player vars object. */
export function buildPlayerVars(
  isPlaying: boolean,
  isMuted: boolean,
  youtubeOrigin: string | null,
): Record<string, number | string> {
  return {
    autoplay: isPlaying ? 1 : 0,
    mute: isMuted ? 1 : 0,
    rel: 0,
    playsinline: 1,
    enablejsapi: 1,
    ...(youtubeOrigin
      ? {
        origin: youtubeOrigin,
        widget_referrer: youtubeOrigin,
      }
      : {}),
  };
}

/** Sync mute state from a YouTube JS API player instance. Returns the new muted state or null if unavailable. */
export function readMuteStateFromPlayer(player: YouTubePlayer): boolean | null {
  const p = player as { getVolume?(): number; isMuted?(): boolean };
  const muted = typeof p.isMuted === 'function'
    ? p.isMuted()
    : (p.getVolume?.() === 0);
  return typeof muted === 'boolean' ? muted : null;
}
