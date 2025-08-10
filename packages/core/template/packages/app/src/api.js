// packages/app/src/api.js

async function callApi(apiKey, ...args) {
  try {
    return await window.longday.call(apiKey, ...args);
  } catch (error) {
    console.error(
      `API Call Failed: ${apiKey}\nArguments: ${JSON.stringify(args)}\nError:`,
      error.message
    );
    throw error;
  }
}

// API для управления ядром и воркерами.
export const core = {
  createWorker: (scriptPath) => callApi('core.createWorker', scriptPath),
  postMessageToWorker: (workerId, message) => callApi('core.postMessageToWorker', workerId, message),
  terminateWorker: (workerId) => callApi('core.terminateWorker', workerId),
  // Добавляем доступ к подписчикам
  onWorkerMessage: window.longday.onWorkerMessage,
  onWorkerExit: window.longday.onWorkerExit,
};

// API для получения общей информации о приложении.
export const app = {
  getPublicConfig: () => callApi('app.getPublicConfig'),
};

export const system = {
  getSystemInfo: () => callApi('system.getSystemInfo'),
  greet: (name) => callApi('system.greet', name),
};

export const settings = {
  getSettings: () => callApi('settings.getSettings'),
  setTheme: (theme) => callApi('settings.setTheme', theme),
};

export const windowApi = {
  minimize: () => callApi('window.minimize'),
  toggleMaximize: () => callApi('window.toggleMaximize'),
  close: () => callApi('window.close'),
};