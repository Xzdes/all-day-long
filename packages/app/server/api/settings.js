// packages/app/server/api/settings.js

// Имитируем хранилище настроек.
let appSettings = {
  theme: 'light', // Тема по умолчанию
};

async function getSettings() {
  console.log('[API settings.getSettings] Returning current settings.');
  return appSettings;
}

async function setTheme(newTheme) {
  if (newTheme === 'light' || newTheme === 'dark') {
    appSettings.theme = newTheme;
    console.log(`[API settings.setTheme] Theme changed to: ${newTheme}`);
    return { success: true, theme: appSettings.theme };
  }
  throw new Error('Invalid theme name. Must be "light" or "dark".');
}

module.exports = {
  getSettings,
  setTheme,
};