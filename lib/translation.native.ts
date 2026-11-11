import VideoAppViewModule from '@/modules/video-app-view'

const normalizeLanguageTag = (tag: string) => {
  const baseTag = tag.replace('_', '-').split('-')[0].toLowerCase()
  return baseTag === 'und' ? '' : baseTag
}

export const getTranslationSupportedLanguages = () => VideoAppViewModule.getTranslationSupportedLanguages()

export const translateText = async (text: string, targetLanguage: string) => {
  const result = await VideoAppViewModule.translateText(text, normalizeLanguageTag(targetLanguage))
  return { ...result, sourceLanguage: result.sourceLanguage ? normalizeLanguageTag(result.sourceLanguage) : undefined }
}
