/**
 * DOM rendering helpers for the LiveNewsPanel.
 * Pure functions that create DOM elements — no class state dependency.
 */
import { t } from '../services/i18n';
import { escapeHtml, sanitizeUrl } from '@/utils/sanitize';
import type { LiveChannel } from './live-news-types';

/** Build a YouTube watch URL for a channel. */
export function buildWatchUrl(channel: LiveChannel): string {
  if (channel.videoId) return `https://www.youtube.com/watch?v=${encodeURIComponent(channel.videoId)}`;
  if (channel.handle) return `https://www.youtube.com/${encodeURIComponent(channel.handle)}`;
  return 'https://www.youtube.com';
}

/** Create the "channel offline" message element. */
export function createOfflineMessage(channel: LiveChannel): string {
  const safeName = escapeHtml(channel.name);
  return `
    <div class="live-offline">
      <div class="offline-icon">\u{1F4FA}</div>
      <div class="offline-text">${t('components.liveNews.notLive', { name: safeName })}</div>
      <button class="offline-retry" onclick="this.closest('.panel').querySelector('.live-channel-btn.active')?.click()">${t('common.retry')}</button>
    </div>
  `;
}

/** Create the "embed error" message element. */
export function createEmbedErrorMessage(channel: LiveChannel, errorCode: number): string {
  const watchUrl = buildWatchUrl(channel);
  const safeName = escapeHtml(channel.name);
  return `
    <div class="live-offline">
      <div class="offline-icon">!</div>
      <div class="offline-text">${t('components.liveNews.cannotEmbed', { name: safeName, code: String(errorCode) })}</div>
      <a class="offline-retry" href="${sanitizeUrl(watchUrl)}" target="_blank" rel="noopener noreferrer">${t('components.liveNews.openOnYouTube')}</a>
    </div>
  `;
}

/** Create the placeholder element shown before the player loads. */
export function createPlaceholderElement(channelName: string, onInit: () => void): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'live-news-placeholder';
  container.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:12px;cursor:pointer;';

  const label = document.createElement('div');
  label.style.cssText = 'color:var(--text-secondary);font-size:13px;';
  label.textContent = channelName;

  const playBtn = document.createElement('button');
  playBtn.className = 'offline-retry';
  playBtn.textContent = 'Load Player';
  playBtn.addEventListener('click', (e) => { e.stopPropagation(); onInit(); });

  container.appendChild(label);
  container.appendChild(playBtn);
  container.addEventListener('click', () => onInit());
  return container;
}

/** SVG markup for play/pause indicator icons. */
export const PAUSE_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
export const PLAY_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>';

/** SVG markup for mute/unmute icons. */
export const MUTED_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
export const UNMUTED_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';

/** SVG markup for fullscreen enter/exit icons. */
export const FULLSCREEN_ENTER_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';
export const FULLSCREEN_EXIT_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 14h6v6"/><path d="M20 10h-6V4"/><path d="M14 10l7-7"/><path d="M3 21l7-7"/></svg>';

/** SVG for the settings gear icon. */
export const SETTINGS_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';

/** Create the bot-check prompt DOM. Returns the wrapper element. */
export function createBotCheckPrompt(
  channel: LiveChannel,
  onSignIn: () => void,
  onRetry: () => void,
): HTMLDivElement {
  const watchUrl = buildWatchUrl(channel);

  const wrapper = document.createElement('div');
  wrapper.className = 'live-offline';

  const icon = document.createElement('div');
  icon.className = 'offline-icon';
  icon.textContent = '\u26A0\uFE0F';

  const text = document.createElement('div');
  text.className = 'offline-text';
  text.textContent = t('components.liveNews.botCheck', { name: channel.name }) || 'YouTube is requesting sign-in verification';

  const actions = document.createElement('div');
  actions.className = 'bot-check-actions';

  const signinBtn = document.createElement('button');
  signinBtn.className = 'offline-retry bot-check-signin';
  signinBtn.textContent = t('components.liveNews.signInToYouTube') || 'Sign in to YouTube';
  signinBtn.addEventListener('click', () => onSignIn());

  const retryBtn = document.createElement('button');
  retryBtn.className = 'offline-retry bot-check-retry';
  retryBtn.textContent = t('common.retry') || 'Retry';
  retryBtn.addEventListener('click', () => onRetry());

  const ytLink = document.createElement('a');
  ytLink.className = 'offline-retry';
  ytLink.href = watchUrl;
  ytLink.target = '_blank';
  ytLink.rel = 'noopener noreferrer';
  ytLink.textContent = t('components.liveNews.openOnYouTube') || 'Open on YouTube';

  actions.append(signinBtn, retryBtn, ytLink);
  wrapper.append(icon, text, actions);
  return wrapper;
}

/** Create the native HLS <video> element. Returns the video element. */
export function createNativeHlsVideoElement(
  hlsUrl: string,
  isPlaying: boolean,
  isMuted: boolean,
): HTMLVideoElement {
  const video = document.createElement('video');
  video.className = 'live-news-native-video';
  video.src = hlsUrl;
  video.autoplay = isPlaying;
  video.muted = isMuted;
  video.playsInline = true;
  video.controls = true;
  video.setAttribute('referrerpolicy', 'no-referrer');
  video.style.cssText = 'width:100%;height:100%;object-fit:contain;background:#000';
  return video;
}

/** Create the desktop embed iframe element. */
export function createDesktopEmbedIframe(
  embedUrl: string,
  channelName: string,
): HTMLIFrameElement {
  const iframe = document.createElement('iframe');
  iframe.className = 'live-news-embed-frame';
  iframe.src = embedUrl;
  iframe.title = `${channelName} live feed`;
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = '0';
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen; storage-access';
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  iframe.setAttribute('loading', 'eager');
  return iframe;
}

/** Create the channel management modal overlay. Returns { overlay, container, close }. */
export function createChannelManagementModal(
  onClose: () => void,
): { overlay: HTMLDivElement; container: HTMLDivElement } {
  const overlay = document.createElement('div') as HTMLDivElement;
  overlay.className = 'live-channels-modal-overlay';
  overlay.setAttribute('aria-modal', 'true');

  const modal = document.createElement('div');
  modal.className = 'live-channels-modal';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'live-channels-modal-close';
  closeBtn.setAttribute('aria-label', t('common.close') ?? 'Close');
  closeBtn.innerHTML = '&times;';

  const container = document.createElement('div') as HTMLDivElement;
  modal.appendChild(closeBtn);
  modal.appendChild(container);
  overlay.appendChild(modal);

  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
    onClose();
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', onKey);

  return { overlay, container };
}
