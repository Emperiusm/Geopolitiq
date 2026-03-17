// YouTube IFrame Player API types
export type YouTubePlayer = {
  mute(): void;
  unMute(): void;
  playVideo(): void;
  pauseVideo(): void;
  loadVideoById(videoId: string): void;
  cueVideoById(videoId: string): void;
  setPlaybackQuality?(quality: string): void;
  getIframe?(): HTMLIFrameElement;
  getVolume?(): number;
  destroy(): void;
};

export type YouTubePlayerConstructor = new (
  elementId: string | HTMLElement,
  options: {
    videoId: string;
    host?: string;
    playerVars: Record<string, number | string>;
    events: {
      onReady: () => void;
      onError?: (event: { data: number }) => void;
    };
  },
) => YouTubePlayer;

export type YouTubeNamespace = {
  Player: YouTubePlayerConstructor;
};

declare global {
  interface Window {
    YT?: YouTubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export interface LiveChannel {
  id: string;
  name: string;
  handle?: string; // YouTube channel handle (e.g., @bloomberg) - optional for HLS streams
  fallbackVideoId?: string; // Fallback if no live stream detected
  videoId?: string; // Dynamically fetched live video ID
  isLive?: boolean;
  hlsUrl?: string; // HLS manifest URL for native <video> playback (desktop)
  useFallbackOnly?: boolean; // Skip auto-detection, always use fallback
  geoAvailability?: string[]; // ISO 3166-1 alpha-2 codes; undefined = available everywhere
}

export interface StoredLiveChannels {
  order: string[];
  custom?: LiveChannel[];
  /** Display name overrides for built-in channels (and custom). */
  displayNameOverrides?: Record<string, string>;
}

export interface ProxiedHlsEntry {
  url: string;
  referer: string;
}
