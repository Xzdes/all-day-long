const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const { fork } = require('child_process'); // ★★★ ИСПОЛЬЗУЕМ ПРАВИЛЬНЫЙ ИНСТРУМЕНТ ★★★

// Хранилище для активных воркеров
const activeWorkers = new Map();

// Универсальный обработчик API
ipcMain.handle('longday:call', async (event, apiKey, ...args) => {
  const func = apiRegistry.get(apiKey);
  const win = BrowserWindow.fromWebContents(event.sender);
  const APP_ROOT = app.getAppPath(); // Это S:\all-day-long\packages\app

  // --- Блок для управления воркерами ядра ---
  if (apiKey.startsWith('core.')) {
    const method = apiKey.split('.')[1];
    
    switch (method) {
      case 'createWorker': {
        const [scriptPath] = args;
        const fullScriptPath = path.join(APP_ROOT, scriptPath);

        if (!fs.existsSync(fullScriptPath)) {
          throw new Error(`Worker script not found: ${fullScriptPath}`);
        }

        const workerId = crypto.randomUUID();
        
        // ★★★ "БРОНЕБОЙНОЕ" РЕШЕНИЕ ★★★
        // Запускаем воркер как НАСТОЯЩИЙ дочерний процесс Node.js.
        // `fork` автоматически создает IPC-канал и обеспечивает наличие `process.send`.
        // Мы передаем путь к корневым node_modules через `cwd`, чтобы `require` работал "из коробки".
        const worker = fork(fullScriptPath, [], {
          // Указываем рабочую директорию, чтобы `require` работал без костылей.
          cwd: APP_ROOT,
          // Важно для отладки
          silent: true 
        });

        worker.stdout.on('data', (data) => console.log(`[Worker ${workerId} STDOUT]:`, data.toString().trim()));
        worker.stderr.on('data', (data) => console.error(`[Worker ${workerId} STDERR]:`, data.toString().trim()));

        // Этот код теперь будет работать, потому что `fork` это гарантирует.
        worker.on('message', (data) => {
          if (win && !win.isDestroyed()) {
            win.webContents.send('longday:worker-message', { workerId, data });
          }
        });

        worker.on('exit', (code) => {
          console.log(`Worker ${workerId} has exited with code ${code}.`);
          activeWorkers.delete(workerId);
          if (win && !win.isDestroyed()) {
            win.webContents.send('longday:worker-exit', { workerId, code });
          }
        });
        
        worker.on('error', (err) => {
           console.error(`[Worker ${workerId} ERROR]:`, err);
        });

        activeWorkers.set(workerId, worker);
        return { workerId };
      }
      
      case 'postMessageToWorker': {
        const [workerId, message] = args;
        const worker = activeWorkers.get(workerId);
        if (worker) {
          worker.send(message); // Стандартный метод для fork
          return { success: true };
        }
        throw new Error(`Worker with ID ${workerId} not found.`);
      }

      case 'terminateWorker': {
        const [workerId] = args;
        const worker = activeWorkers.get(workerId);
        if (worker) {
          worker.kill();
          activeWorkers.delete(workerId);
          return { success: true };
        }
        throw new Error(`Worker with ID ${workerId} not found.`);
      }

      default:
        throw new Error(`Unknown core API method: ${method}`);
    }
  }

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
let config;
const apiRegistry = new Map();

/**
 * Главная асинхронная функция инициализации.
 */
async function initialize() {
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
 */
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
      const url = `http://127.0.0.1:${port}`;
      console.log(`[Core] Local server running at: ${url}`);
      resolve(url);
    });
    server.on('error', (err) => reject(err));
  });
}

/**
 * Создает и настраивает главное окно приложения.
 */
function createWindow(serverUrl) {
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
    if (BrowserWindow.getAllWindows().length === 0) {
        initialize();
    }
});