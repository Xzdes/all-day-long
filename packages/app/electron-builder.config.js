// packages/app/electron-builder.config.js
const appConfig = require('./longday.config.js');

/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
const config = {
  // --- Используем данные из longday.config.js ---
  appId: appConfig.app.appId,
  productName: appConfig.app.productName,
  
  // ★★★ ГЛАВНОЕ И ОКОНЧАТЕЛЬНОЕ ИСПРАВЛЕНИЕ ★★★
  // Ключ 'main' должен находиться внутри объекта 'extraMetadata'.
  // Это специальный блок, который electron-builder использует для того,
  // чтобы переопределить поля в package.json, который попадает в сборку.
  extraMetadata: {
    main: 'core/main.js',
  },

  directories: {
    buildResources: 'assets',
    // Куда складывать готовые дистрибутивы
    output: '../../dist',
  },
  
  // Явно перечисляем только то, что необходимо для работы приложения.
  files: [
    "public/**/*", // Собранный UI
    "server/api/**/*", // Наши серверные API
    "server/workers-dist/**/*", // ★ Только собранные воркеры
    "longday.config.js", // Конфигурация приложения
    "package.json",
    {
      "from": "../core", // Наше ядро
      "to": "core"
    }
  ],
  
  win: {
    target: 'nsis',
    icon: 'assets/icon.ico',
  },
  mac: {
    target: 'dmg',
    icon: 'assets/icon.icns',
  },
  linux: {
    target: 'AppImage',
    icon: 'assets/icon.png',
  },
};

module.exports = config;