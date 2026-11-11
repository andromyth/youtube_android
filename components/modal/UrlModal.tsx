import { useValue } from '@legendapp/state/react'
import { ui$ } from '@/states/ui'
import { BaseCenterModal } from './BaseCenterModal'
import { VideoText } from '../VideoText'
import { TextInput, View } from 'react-native'
import { useEffect, useState } from 'react'
import { gray } from '@radix-ui/colors'
import { VideoButton } from '../button/VideoButton'
import { openSharedUrl } from '@/lib/page'
import { t } from 'i18next'

export const UrlModal = () => {
  const urlModalOpen = useValue(ui$.urlModalOpen)
  const [url, setUrl] = useState('')
  const onClose = () => ui$.urlModalOpen.set(false)

  useEffect(() => {
    /* A pasted URL pre-fills the input, so the modal doubles as a confirmation. */
    setUrl(urlModalOpen ? ui$.urlModalUrl.get() : '')
    ui$.urlModalUrl.set('')
  }, [urlModalOpen])

  const onSubmit = () => {
    if (!url.trim()) {
      return
    }
    openSharedUrl(url)
    onClose()
    ui$.settingsModalOpen.set(false)
  }

  if (!urlModalOpen) {
    return null
  }

  return (
    <BaseCenterModal onClose={onClose}>
      <View className="p-5">
        <VideoText className="text-lg font-semibold mb-4">{t('buttons.openUrl')}</VideoText>
        <VideoText className="mb-1 font-semibold text-zinc-700 dark:text-zinc-300">URL</VideoText>
        <TextInput
          className="border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded mb-3 text-zinc-900 dark:text-zinc-100 p-2 text-sm"
          value={url}
          onChangeText={setUrl}
          placeholder="https://www.youtube.com/watch?v=xxx"
          placeholderTextColor={gray.gray11}
          autoFocus
        />
        <View className="">
          <VideoText className="text-zinc-600 dark:text-gray-400 text-sm">Supported URLs</VideoText>
          <VideoText className="text-zinc-500 dark:text-gray-500 text-sm">https://*.youtube.com/*</VideoText>
          <VideoText className="text-zinc-500 dark:text-gray-500 text-sm">https://youtu.be/*</VideoText>
          <VideoText className="text-zinc-500 dark:text-gray-500 text-sm">videoapp:*</VideoText>
        </View>
        <View className="flex-row items-center justify-between mt-6">
          <VideoButton variant="outline" size="1" onPress={onClose}>
            {t('buttons.cancel')}
          </VideoButton>
          <VideoButton onPress={onSubmit}>{t('buttons.open')}</VideoButton>
        </View>
      </View>
    </BaseCenterModal>
  )
}
