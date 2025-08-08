// packages/core/preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Мы предоставляем вашему React-приложению доступ к одному глобальному объекту: window.longday
contextBridge.exposeInMainWorld('longday', {
  /**
   * Универсальный метод для вызова любой зарегистрированной серверной функции.
   * @param {string} apiKey - Ключ API в формате "модуль.функция" (например, "files.getUsers").
   * @param {...any} args - Аргументы, которые будут переданы в вашу серверную функцию.
   * @returns {Promise<any>} - Промис, который вернет результат выполнения вашей функции.
   */
  call: (apiKey, ...args) => {
    // Все вызовы безопасно проходят через один канал 'longday:call'
    return ipcRenderer.invoke('longday:call', apiKey, ...args);
  }
});