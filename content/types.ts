import type { ElectronAPI } from '@electron-toolkit/preload'

interface VideoAppI {
  onMessage: (payload: string) => void
  notify: (title: string, author: string, seconds: number, thumbnail: string) => void
  notifyProgress: (playing: boolean, pos: number) => void
  // Added in app 0.6.8; guard before calling so older shells keep working.
  // They take window.VideoAppToken, which only the main frame is given.
  setBrightness?: (token: string, value: number) => void
  getBrightness?: (token: string) => number
  getVolumeSteps?: (token: string) => number
  getVolumeIndex?: (token: string) => number
  setVolumeIndex?: (token: string, index: number) => void
  canAutoResume?: (token: string) => boolean
  setPictureInPictureVideo?: (token: string, width: number, height: number) => void
}

declare global {
  interface Window {
    _lact: number
    isAndroid: boolean
    VideoAppInitialSettings?: Record<string, unknown>
    VideoAppBlocklist?: import('../lib/blocklist').BlocklistSnapshot
    VideoAppUserStyles?: import('../lib/user-styles').UserStylesSnapshot
    VideoAppI: VideoAppI
    VideoAppToken?: string
    // Real app visibility fed by VideoAppView.onWindowVisibilityChanged; the
    // page itself always reports "visible" (see VideoWebView).
    VideoAppBackground?: boolean
    VideoAppPip?: boolean
    // Split watch view: which page this webview owns (see content/split-view.ts).
    VideoAppRole?: 'browse' | 'player'
    VideoAppNativeMini?: boolean
    // Television build: enables remote-first feed navigation (see
    // content/remote-navigation.ts).
    VideoAppTV?: boolean
    // Timestamp of the last explicit fullscreen request; see content/player.ts.
    VideoAppFsIntent?: number
    VideoApp: any
    trustedTypes: any
    electron: ElectronAPI
  }
}
