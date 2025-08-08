// packages/app/longday.config.js
const path = require('path');

module.exports = {
  // Настройки, которые влияют на всё приложение (упаковку, трей и т.д.)
  app: {
    appId: 'com.mycompany.inventory-manager',
    productName: 'Inventory Manager',
  },

  // Настройки, которые влияют на главное окно Electron
  window: {
    width: 1280,
    height: 720,
    title: "Система Управления Запасами",
    frame: false, // Убираем стандартную рамку ОС
    titleBarStyle: 'hidden', // Скрываем кнопки (для создания кастомного title bar)
    icon: path.join(__dirname, 'assets', 'icon.png'), // Укажите путь к вашей иконке
    devtools: true, // Автоматически открывать инструменты разработчика
  },

  // Пути к вашим файлам
  apiPath: path.join(__dirname, 'server', 'api'),
  publicPath: path.join(__dirname, 'public'),
};