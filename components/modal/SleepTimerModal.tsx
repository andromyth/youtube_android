import { useValue } from '@legendapp/state/react'
import { ui$ } from '@/states/ui'
import { BaseCenterModal } from './BaseCenterModal'
import { VideoText } from '../VideoText'
import { TextInput, View } from 'react-native'
import { useEffect, useState } from 'react'
import { gray } from '@radix-ui/colors'
import { VideoButton } from '../button/VideoButton'
import { t } from 'i18next'
import { showToast } from '@/lib/toast'
import {
  formatSleepTimerRemaining,
  parseSleepTimerMinutes,
  SLEEP_TIMER_MINUTES_PRESETS,
  useSleepTimerStatus,
} from '@/lib/sleep-timer'
import {
  clearNativeSleepTimer,
  getNativeSleepTimerRemainingMs,
  hasSleepTimerNativeSupport,
  setNativeSleepTimer,
} from '@/lib/sleep-timer-native'
import { sleepTimer$ } from '@/states/sleep-timer'

export const SleepTimerModal = () => {
  const sleepTimerModalOpen = useValue(ui$.sleepTimerModalOpen)
  const supported = hasSleepTimerNativeSupport()
  const { active, remainingMs } = useSleepTimerStatus(sleepTimerModalOpen)
  const [text, setText] = useState('')
  const [replaceMode, setReplaceMode] = useState(false)
  const onClose = () => ui$.sleepTimerModalOpen.set(false)

  useEffect(() => {
    if (!sleepTimerModalOpen || !supported) {
      return
    }

    setText('')
    setReplaceMode(false)
    void getNativeSleepTimerRemainingMs()
      .then((nextRemainingMs) => sleepTimer$.setRemainingMs(nextRemainingMs))
      .catch((error) => {
        console.error('getSleepTimerRemainingMs failed', error)
      })
  }, [sleepTimerModalOpen, supported])

  useEffect(() => {
    if (!active) {
      setReplaceMode(false)
    }
  }, [active])

  if (!sleepTimerModalOpen || !supported) {
    return null
  }

  const setTimer = async (minutes: number) => {
    await setNativeSleepTimer(minutes * 60 * 1000)
    showToast(t('sleepTimer.setToast', { value: minutes }))
    onClose()
  }

  const onSubmit = async () => {
    const parsed = parseSleepTimerMinutes(text)
    if (!parsed.ok) {
      showToast(t('sleepTimer.validation.minutes'))
      return
    }

    await setTimer(parsed.minutes)
  }

  const onCancelTimer = async () => {
    await clearNativeSleepTimer()
    showToast(t('sleepTimer.cancelToast'))
  }

  const showingActiveState = active && !replaceMode

  return (
    <BaseCenterModal onClose={onClose}>
      <View className="p-5">
        <VideoText className="mb-2 text-lg font-semibold">{t('sleepTimer.label')}</VideoText>
        {showingActiveState ? (
          <>
            <VideoText className="mb-3 text-sm leading-5 text-gray-400">{t('sleepTimer.activeHint')}</VideoText>
            <VideoText className="mb-6 text-4xl font-semibold tracking-tight">
              {formatSleepTimerRemaining(remainingMs)}
            </VideoText>
            <View className="flex-row items-center justify-end gap-2">
              <VideoButton variant="soft" size="1" onPress={() => void onCancelTimer()}>
                {t('sleepTimer.cancel')}
              </VideoButton>
              <VideoButton size="1" onPress={() => setReplaceMode(true)}>
                {t('sleepTimer.replace')}
              </VideoButton>
            </View>
          </>
        ) : (
          <>
            <VideoText className="mb-5 text-sm leading-5 text-gray-400">{t('sleepTimer.hint')}</VideoText>

            <View className="mb-5 flex-row flex-wrap gap-2">
              {SLEEP_TIMER_MINUTES_PRESETS.map((minutes) => (
                <VideoButton key={minutes} variant="soft" size="1" onPress={() => void setTimer(minutes)}>
                  {t('sleepTimer.preset', { value: minutes })}
                </VideoButton>
              ))}
            </View>

            <TextInput
              className="mb-6 rounded border border-gray-600 p-3 text-white text-sm"
              value={text}
              onChangeText={setText}
              placeholder={t('sleepTimer.customPlaceholder')}
              placeholderTextColor={gray.gray11}
              keyboardType="number-pad"
            />

            <View className="flex-row items-center justify-between">
              <VideoButton
                variant="outline"
                size="1"
                onPress={() => {
                  if (active) {
                    setReplaceMode(false)
                    return
                  }
                  onClose()
                }}
              >
                {t('buttons.cancel')}
              </VideoButton>
              <VideoButton size="1" onPress={() => void onSubmit()}>
                {t('sleepTimer.set')}
              </VideoButton>
            </View>
          </>
        )}
      </View>
    </BaseCenterModal>
  )
}
