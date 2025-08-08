// packages/core/main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path =require('path');
const fs = require('fs');
const http = require('http');

// --- ШАГ 1: ЗАГРУЗКА КОНФИГУРАЦИИ ПРИЛОЖЕНИЯ ---

const APP_ROOT = process.cwd();

let config = {
  window: {
    width: 800,
    height: 600,
    title: 'All Day Long App',
    devtools: false
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
      window: { ...config.window, ...userConfig.window }
    };
    console.log('[Core] Loaded app configuration from longday.config.js');
  } else {
    console.warn('[Core] longday.config.js not found. Using default settings.');
  }
} catch (e) {
  console.error('[Core] Error loading longday.config.js:', e);
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

ipcMain.handle('longday:call', async (event, apiKey, ...args) => {
  const func = api.get(apiKey);
  if (!func) throw new Error(`API function "${apiKey}" is not registered.`);
  try {
    return await func(...args);
  } catch (error) {
    console.error(`[Core] Error during execution of API "${apiKey}":`, error);
    throw error;
  }
});


// --- ШАГ 3: ЗАПУСК ЛОКАЛЬНОГО СЕРВЕРА ДЛЯ REACT ---

function startLocalServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const filePath = path.join(config.publicPath, req.url === '/' ? 'index.html' : req.url);
      fs.readFile(filePath, (err, data) => {
        if (err) {
          // ★★★ НАШЕ ИСПРАВЛЕНИЕ ★★★
          // Генерируем HTML, который подключает И СТИЛИ, И СКРИПТЫ.
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`<!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <title>${config.window.title}</title>
                <link rel="stylesheet" href="/bundle.css">
              </head>
              <body>
                <div id="root"></div>
                <script defer src="/bundle.js"></script>
              </body>
            </html>`);
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
      icon: config.iconPath,
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