import { useEffect, useRef } from 'react'
import { View } from 'react-native'
import { BaseCenterModal } from './BaseCenterModal'
import { ui$ } from '@/states/ui'
import { settings$ } from '@/states/settings'
import { VideoText } from '../VideoText'
import { useValue } from '@legendapp/state/react'
import { clsx } from '@/lib/utils'
import { formatPlaybackRate, playbackRatesWith } from '@/lib/playback-rate'
import { VideoButton } from '../button/VideoButton'

import { t } from 'i18next'

export const PlaybackSpeedModal = () => {
  const playbackSpeedModalOpen = useValue(ui$.playbackSpeedModalOpen)
  const currentRate = useValue(settings$.playbackRate)
  const selectedButtonRef = useRef<View | null>(null)

  // Match the quality dialog: on a TV the remote should land on the rate that
  // is active, so one OK is enough to dismiss the dialog unchanged.
  useEffect(() => {
    if (!playbackSpeedModalOpen) return
    const timeout = setTimeout(() => selectedButtonRef.current?.focus(), 150)
    return () => clearTimeout(timeout)
  }, [playbackSpeedModalOpen])

  const onSelect = (rate: number) => {
    settings$.playbackRate.set(rate)
    ui$.webview.get()?.executeJavaScript(`window.VideoApp.setPlaybackRate(${rate})`)
    ui$.playbackSpeedModalOpen.set(false)
  }

  if (!playbackSpeedModalOpen) {
    return null
  }

  return (
    <BaseCenterModal onClose={() => ui$.playbackSpeedModalOpen.set(false)} containerClassName="w-[24rem] max-w-[88vw]">
      <View className="p-6">
        <VideoText className="text-lg font-semibold text-center">{t('modals.playbackSpeed')}</VideoText>
        <View className="mt-6 flex-row flex-wrap justify-center gap-x-3 gap-y-4">
          {playbackRatesWith(currentRate).map((rate) => {
            const active = currentRate === rate
            return (
              <VideoButton
                key={rate}
                hasTVPreferredFocus={active}
                focusRef={active ? (view) => { selectedButtonRef.current = view } : undefined}
                onPress={() => onSelect(rate)}
                variant={active ? 'solid' : 'outline'}
                size="1"
                className={clsx(
                  'min-w-[72px] rounded-xl items-center justify-center',
                  active
                    ? 'bg-indigo-600 dark:bg-indigo-500'
                    : 'border-zinc-300 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900',
                )}
                textClassName={active ? 'text-white' : 'text-zinc-800 dark:text-zinc-200'}
              >
                {formatPlaybackRate(rate)}
              </VideoButton>
            )
          })}
        </View>
      </View>
    </BaseCenterModal>
  )
}
