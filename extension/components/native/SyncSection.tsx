import { useState } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { VideoButton } from '@/components/button/VideoButton'
import { VideoText } from '@/components/VideoText'
import { sectionLabelCls, surfaceCls } from '@/components/modal/SettingsTree'
import { useAppSnapshot } from './AppShell'
import { request } from '../../lib/messages'
import { nIf } from '../../lib/ui'

/*
 * Stands in for the app's sync page. The app signs in through a web login that
 * hands the session to the shell it is running in; here only the background can
 * hold a session, so every button is a message to it.
 */
export const SyncSection = () => {
  const { t } = useTranslation()
  const { snapshot, refresh, setError } = useAppSnapshot()
  const [busy, setBusy] = useState(false)

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await action()
      await refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setBusy(false)
    }
  }

  const signedIn = Boolean(snapshot?.auth.userId)

  return (
    <View>
      <VideoText className={sectionLabelCls}>{t('sync.label')}</VideoText>
      <View className={surfaceCls}>
        <View className="gap-4 px-5 py-5">
          <VideoText className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">{t('sync.hint')}</VideoText>
          <VideoText className="text-sm">
            {signedIn ? `${t('sync.currentPlan')}: ${snapshot?.auth.plan}` : t('extension.signedOut')}
          </VideoText>

          {nIf(
            !signedIn,
            <VideoButton className="self-start" loading={busy} onPress={() => void run(() => request({ type: 'sign-in' }))}>
              {t('extension.signIn')}
            </VideoButton>,
          )}

          {nIf(
            signedIn,
            <View className="flex-row flex-wrap gap-3">
              <VideoButton loading={busy} onPress={() => void run(() => request({ type: 'sync-now' }))}>
                {t('extension.syncNow')}
              </VideoButton>
              <VideoButton variant="outline" loading={busy} onPress={() => void run(() => request({ type: 'sign-out' }))}>
                {t('buttons.signOut')}
              </VideoButton>
            </View>,
          )}

          {nIf(
            snapshot?.syncError,
            <VideoText className="text-sm text-red-600 dark:text-red-400">{snapshot?.syncError}</VideoText>,
          )}
        </View>
      </View>
    </View>
  )
}
