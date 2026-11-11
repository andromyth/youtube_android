import { openSharedUrl } from '@/lib/page'
import { isSupportedUrl } from '@/lib/supported-url'
import '../../types'

export function handleDeeplink(link: string): void {
  const url = new URL(link)
  if (url.protocol != 'videoapp:' && !isSupportedUrl(link)) {
    return
  }
  // console.log('on deeplink', link)
  openSharedUrl(link)
}

window.videoappDeeplink = handleDeeplink
