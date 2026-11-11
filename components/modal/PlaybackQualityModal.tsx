import { useEffect, useRef } from 'react'
import { View } from 'react-native'
import { BaseCenterModal } from './BaseCenterModal'
import { ui$ } from '@/states/ui'
import { settings$ } from '@/states/settings'
import { VideoText } from '../VideoText'
import { useValue } from '@legendapp/state/react'
import { clsx } from '@/lib/utils'
import { playbackQualities } from '@/lib/playback-quality'
import { VideoButton } from '../button/VideoButton'

import { t } from 'i18next'

export const PlaybackQualityModal = () => {
  const playbackQualityModalOpen = useValue(ui$.playbackQualityModalOpen)
  const currentQuality = useValue(settings$.playbackQuality)
  const selectedButtonRef = useRef<View | null>(null)

  useEffect(() => {
    if (!playbackQualityModalOpen) return
    const timeout = setTimeout(() => selectedButtonRef.current?.focus(), 150)
    return () => clearTimeout(timeout)
  }, [playbackQualityModalOpen])

  const onSelect = (quality: string) => {
    settings$.playbackQuality.set(quality)
    ui$.webview.get()?.executeJavaScript(`window.VideoApp.setPlaybackQuality('${quality}')`)
    ui$.playbackQualityModalOpen.set(false)
  }

  if (!playbackQualityModalOpen) {
    return null
  }

  return (
    <BaseCenterModal onClose={() => ui$.playbackQualityModalOpen.set(false)} containerClassName="w-[24rem] max-w-[88vw]">
      <View className="p-6">
        <VideoText className="text-lg font-semibold text-center">{t('modals.playbackQuality')}</VideoText>
        <View className="mt-6 flex-row flex-wrap justify-center gap-x-3 gap-y-4">
          {playbackQualities.map((q) => {
            const active = currentQuality === q.value
            return (
              <VideoButton
                key={q.value}
                hasTVPreferredFocus={active}
                focusRef={active ? (view) => { selectedButtonRef.current = view } : undefined}
                onPress={() => onSelect(q.value)}
                variant={active ? 'solid' : 'outline'}
                size="1"
                className={clsx(
                  'min-w-[100px] rounded-xl items-center justify-center',
                  active
                    ? 'bg-indigo-600 dark:bg-indigo-500'
                    : 'border-zinc-300 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900',
                )}
                textClassName={active ? 'text-white' : 'text-zinc-800 dark:text-zinc-200'}
              >
                {q.label}
              </VideoButton>
            )
          })}
        </View>
      </View>
    </BaseCenterModal>
  )
}
