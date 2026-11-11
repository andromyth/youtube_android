import { ElectronAPI } from '@electron-toolkit/preload'
import 'videoapp/content/types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
  }
}
