import { requireNativeView } from 'expo';
import * as React from 'react';

import { VideoAppViewProps } from './VideoAppView.types';

const NativeView: React.ComponentType<VideoAppViewProps> =
  requireNativeView('VideoAppView');

export default function VideoAppView(props: VideoAppViewProps) {
  return <NativeView {...props} />;
}
