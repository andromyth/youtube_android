import * as React from 'react'
import { VideoAppViewProps } from './VideoAppView.types'

export default function VideoAppView(props: VideoAppViewProps) {
  // @ts-expect-error x
  return <webview {...props} />
}
