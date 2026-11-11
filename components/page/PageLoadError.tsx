import { View } from 'react-native'
import { t } from 'i18next'
import { VideoText } from '../VideoText'
import { VideoButton } from '../button/VideoButton'
import { nIf } from '@/lib/utils'

/**
 * Covers the stock WebView error page, which offers no way back once a load
 * fails — pull to refresh is off on /watch and /shorts (#339).
 */
export const PageLoadError = ({ description, onRetry }: { description?: string; onRetry: () => void }) => (
  <View className="absolute inset-0 items-center justify-center gap-4 px-8 bg-white dark:bg-zinc-900">
    <VideoText className="text-xl font-semibold text-center">{t('pageLoadError.title')}</VideoText>
    <VideoText className="text-center text-zinc-600 dark:text-zinc-400">{t('pageLoadError.description')}</VideoText>
    {nIf(
      description,
      <VideoText className="text-center text-xs text-zinc-500 dark:text-zinc-500">{description}</VideoText>,
    )}
    <VideoButton onPress={onRetry}>{t('buttons.retry')}</VideoButton>
  </View>
)
