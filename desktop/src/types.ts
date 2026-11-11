/// <reference types="vite/client" />

declare global {
  interface Window {
    videoappDeeplink: (link: string) => void
  }
}

export {}
