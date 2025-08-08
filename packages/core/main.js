const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Мы не определяем глобальные переменные здесь.
// Вся инициализация будет инкапсулирована в функции `initialize`.

// Универсальный обработчик API остается в глобальной области видимости,
// так как `ipcMain` является синглтоном.
ipcMain.handle('longday:call', async (event, apiKey, ...args) => {
  // Мы получаем доступ к `apiRegistry` через замыкание, после его инициализации.
  // Это безопасно, так как `handle` вызывается только после того, как приложение уже работает.
  const func = apiRegistry.get(apiKey);
  const win = BrowserWindow.fromWebContents(event.sender);

  // Перехват специальных команд ядра для управления окном
  if (apiKey.startsWith('window.')) {
    const method = apiKey.split('.')[1];
    switch (method) {
      case 'minimize':
        if (win) win.minimize();
        return;
      case 'toggleMaximize':
        if (win) {
            win.isMaximized() ? win.unmaximize() : win.maximize();
        }
        return;
      case 'close':
        if (win) win.close();
        return;
      default:
        throw new Error(`Unknown window API method: ${method}`);
    }
  }

  // Обычная обработка API приложения
  if (!func) {
    throw new Error(`API function "${apiKey}" is not registered.`);
  }
  try {
    return await func(...args);
  } catch (error) {
    console.error(`[Core] Error during execution of API "${apiKey}":`, error);
    throw error;
  }
});

// Глобальные переменные, которые будут инициализированы, когда приложение будет готово.
// Они доступны только внутри этого модуля.
let config;
const apiRegistry = new Map();

/**
 * Главная асинхронная функция инициализации.
 * Запускается один раз, когда Electron готов к работе.
 */
async function initialize() {
  // ★★★ КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ ★★★
  // app.getAppPath() - это ЕДИНСТВЕННЫЙ надежный способ получить путь к корню приложения.
  // В разработке он указывает на packages/app.
  // В собранном виде он указывает на resources/app.asar.
  const APP_ROOT = app.getAppPath();

  // --- ШАГ 1: ЗАГРУЗКА КОНФИГУРАЦИИ ---
  config = {
    app: { appId: 'com.electron.default', productName: 'Default App' },
    window: { width: 900, height: 680, title: 'Default Title' },
    apiPath: path.join(APP_ROOT, 'server', 'api'),
    publicPath: path.join(APP_ROOT, 'public'),
  };
  try {
    const userConfigPath = path.join(APP_ROOT, 'longday.config.js');
    if (fs.existsSync(userConfigPath)) {
        const userConfig = require(userConfigPath);
        config = {
            ...config,
            ...userConfig,
            app: { ...config.app, ...userConfig.app },
            window: { ...config.window, ...userConfig.window }
        };
        console.log('[Core] Loaded app configuration.');
    } else {
        console.warn('[Core] longday.config.js not found. Using default settings.');
    }
  } catch (e) {
    console.error('[Core] Error loading longday.config.js:', e);
  }

  // --- ШАГ 2: РЕГИСТРАЦИЯ API ---
  try {
    if (fs.existsSync(config.apiPath)) {
        const apiFiles = fs.readdirSync(config.apiPath).filter(f => f.endsWith('.js'));
        for (const file of apiFiles) {
          const moduleName = path.basename(file, '.js');
          const apiModule = require(path.join(config.apiPath, file));
          for (const funcName in apiModule) {
            if (typeof apiModule[funcName] === 'function') {
                apiRegistry.set(`${moduleName}.${funcName}`, apiModule[funcName]);
            }
          }
        }
        console.log(`[Core] Successfully registered ${apiRegistry.size} API functions.`);
    } else {
        console.warn(`[Core] API directory not found at ${config.apiPath}.`);
    }
  } catch(e) {
    console.error('[Core] Failed to register APIs:', e);
  }

  // --- ШАГ 3: ЗАПУСК ЛОКАЛЬНОГО СЕРВЕРА ---
  const serverUrl = await startLocalServer();

  // --- ШАГ 4: СОЗДАНИЕ ОКНА ---
  await createWindow(serverUrl);
}

/**
 * Запускает локальный HTTP-сервер для отдачи React-приложения.
 * @returns {Promise<string>} URL запущенного сервера.
 */
function startLocalServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      // Путь к файлам теперь строится от правильного `config.publicPath`, который основан на `APP_ROOT`.
      const filePath = path.join(config.publicPath, req.url === '/' ? 'index.html' : req.url);
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${config.window.title}</title><link rel="stylesheet" href="/bundle.css"></head><body><div id="root"></div><script defer src="/bundle.js"></script></body></html>`);
        } else {
          res.writeHead(200);
          res.end(data);
        }
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const url = `http://127.0.0.1:${port}`;
      console.log(`[Core] Local server running at: ${url}`);
      resolve(url);
    });
    server.on('error', (err) => reject(err));
  });
}

/**
 * Создает и настраивает главное окно приложения.
 * @param {string} serverUrl - URL для загрузки в окно.
 */
function createWindow(serverUrl) {
  const win = new BrowserWindow({
    ...config.window,
    icon: config.window.icon,
    webPreferences: {
      // `preload` всегда лежит рядом с `main.js` в папке ядра.
      preload: path.join(__dirname, 'preload.js'),
      csp: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
    }
  });

  win.loadURL(serverUrl);

  if (config.window.devtools) {
      win.webContents.openDevTools();
  }
}

// Запускаем всю нашу инициализацию только тогда, когда приложение готово.
app.whenReady().then(initialize);

// Стандартная обработка жизненного цикла приложения.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // На macOS принято заново создавать окно, если оно было закрыто, а приложение осталось в доке.
    if (BrowserWindow.getAllWindows().length === 0) {
        initialize();
    }
});