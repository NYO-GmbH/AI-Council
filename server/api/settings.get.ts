import { getSettings, SETTINGS_DEFAULTS } from '~~/server/utils/settings'

export default defineEventHandler(async () => {
  const settings = await getSettings()
  return {
    ...settings,
    defaults: SETTINGS_DEFAULTS,
  }
})
