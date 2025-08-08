// packages/app/longday.config.js
const path = require('path');

module.exports = {
  // Настройки окна Electron
  window: {
    width: 1024,
    height: 768,
    title: "Мое первое All-Day-Long приложение",
  },

  // Где искать ваши серверные функции
  apiPath: path.join(__dirname, 'server', 'api'),

  // Где лежат ваши статичные файлы (скомпилированный React)
  publicPath: path.join(__dirname, 'public'),
};