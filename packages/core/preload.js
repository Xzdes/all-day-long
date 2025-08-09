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
  },

  /**
   * Подписывается на сообщения от воркеров.
   * @param {function(workerId: string, data: any)} callback - Функция, которая будет вызываться при получении сообщения.
   * @returns {function} - Функция для отписки от событий.
   */
  onWorkerMessage: (callback) => {
    const handler = (event, { workerId, data }) => callback(workerId, data);
    ipcRenderer.on('longday:worker-message', handler);
    // Возвращаем функцию для очистки, это лучшая практика для React.useEffect
    return () => ipcRenderer.removeListener('longday:worker-message', handler);
  },

  /**
   * Подписывается на событие завершения работы воркера.
   * @param {function(workerId: string, code: number)} callback - Функция, которая будет вызываться.
   * @returns {function} - Функция для отписки от событий.
   */
  onWorkerExit: (callback) => {
    const handler = (event, { workerId, code }) => callback(workerId, code);
    ipcRenderer.on('longday:worker-exit', handler);
    return () => ipcRenderer.removeListener('longday:worker-exit', handler);
  }
});