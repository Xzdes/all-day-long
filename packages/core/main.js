// packages/core/main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

// --- ШАГ 1: ЗАГРУЗКА КОНФИГУРАЦИИ ПРИЛОЖЕНИЯ ---

const APP_ROOT = process.cwd();

let config = {
  app: {
    appId: 'com.electron.alldaylongapp',
    productName: 'All Day Long App',
  },
  window: {
    width: 800,
    height: 600,
    title: 'All Day Long App',
    frame: true,
    titleBarStyle: 'default',
    devtools: false,
  },
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
    console.log('[Core] Loaded app configuration from longday.config.js');
  } else {
    console.warn('[Core] longday.config.js not found. Using default settings.');
  }
} catch (e) {
  console.error('[Core] Error loading longday.config.js:', e);
}

if (config.app.appId) {
  app.setAppUserModelId(config.app.appId);
}
if (config.app.productName) {
    app.setName(config.app.productName);
}


// --- ШАГ 2: РЕГИСТРАЦИЯ СЕРВЕРНЫХ API ---

const api = new Map();
try {
  if (fs.existsSync(config.apiPath)) {
    const apiFiles = fs.readdirSync(config.apiPath).filter(f => f.endsWith('.js'));
    for (const file of apiFiles) {
      const moduleName = path.basename(file, '.js');
      const apiModule = require(path.join(config.apiPath, file));
      for (const functionName in apiModule) {
        if (typeof apiModule[functionName] === 'function') {
          api.set(`${moduleName}.${functionName}`, apiModule[functionName]);
        }
      }
    }
    console.log(`[Core] Successfully registered ${api.size} API functions.`);
  } else {
    console.warn(`[Core] API directory not found at ${config.apiPath}. No APIs were registered.`);
  }
} catch (e) {
  console.error(`[Core] Failed to register APIs from ${config.apiPath}:`, e.message);
}

// --- УЛУЧШЕННЫЙ ОБРАБОТЧИК API С ПЕРЕХВАТОМ КОМАНД ОКНА ---
ipcMain.handle('longday:call', async (event, apiKey, ...args) => {
  // `event.sender` - это webContents, который отправил вызов.
  // Из него мы можем получить окно (BrowserWindow), к которому он принадлежит.
  const win = BrowserWindow.fromWebContents(event.sender);

  // --- ПЕРЕХВАТ СПЕЦИАЛЬНЫХ КОМАНД ЯДРА ---
  // Если вызов начинается с "window.", мы обрабатываем его здесь и не ищем в API приложения.
  if (apiKey.startsWith('window.')) {
    const method = apiKey.split('.')[1]; // Берем имя метода, например, "minimize"
    switch (method) {
      case 'minimize':
        if (win) win.minimize();
        return; // Завершаем выполнение
      case 'toggleMaximize':
        if (win) {
          if (win.isMaximized()) {
            win.unmaximize();
          } else {
            win.maximize();
          }
        }
        return; // Завершаем выполнение
      case 'close':
        if (win) win.close();
        return; // Завершаем выполнение
      default:
        // Если метод неизвестен, выбрасываем ошибку.
        throw new Error(`Unknown window API method: ${method}`);
    }
  }

  // --- ОБЫЧНАЯ ОБРАБОТКА API ПРИЛОЖЕНИЯ ---
  // Этот код выполнится, только если apiKey не начинается с "window."
  const func = api.get(apiKey);
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


// --- ШАГ 3: ЗАПУСК ЛОКАЛЬНОГО СЕРВЕРА ---

function startLocalServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
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
      const serverUrl = `http://127.0.0.1:${port}`;
      console.log(`[Core] React app server running at: ${serverUrl}`);
      resolve(serverUrl);
    });
    server.on('error', (err) => reject(err));
  });
}


// --- ШАГ 4: СОЗДАНИЕ ОКНА ELECTRON ---

async function createWindow() {
  try {
    const serverUrl = await startLocalServer();
    const win = new BrowserWindow({
      ...config.window,
      icon: config.window.icon,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        csp: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
      }
    });
    win.loadURL(serverUrl);
    if (config.window.devtools) {
        win.webContents.openDevTools();
    }
  } catch (error) {
    console.error('[Core] CRITICAL: Failed to create window or start server.', error);
    app.quit();
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit());
app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow());