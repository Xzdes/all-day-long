// packages/app/electron-builder.config.js
const appConfig = require('./longday.config.js');

/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
const config = {
  appId: appConfig.app.appId,
  productName: appConfig.app.productName,
  main: 'core/main.js',

  directories: {
    buildResources: 'assets',
    output: '../../dist',
  },

  // ★★★ ФИНАЛЬНОЕ УКРЕПЛЕНИЕ ★★★
  // Вместо того чтобы включать все подряд ('**/*'), мы явно перечисляем
  // только то, что необходимо для работы приложения. Это чище и надежнее.
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