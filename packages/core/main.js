const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const { fork } = require('child_process');

const activeWorkers = new Map();

const WORKERS_TEMP_DIR = path.join(app.getPath('userData'), 'temp_workers');
if (!fs.existsSync(WORKERS_TEMP_DIR)) {
  fs.mkdirSync(WORKERS_TEMP_DIR, { recursive: true });
}

ipcMain.handle('longday:call', async (event, apiKey, ...args) => {
  const func = apiRegistry.get(apiKey);
  const win = BrowserWindow.fromWebContents(event.sender);
  const APP_ROOT = app.getAppPath();

  if (apiKey.startsWith('core.')) {
    const method = apiKey.split('.')[1];
    
    switch (method) {
      case 'createWorker': {
        const [originalScriptPath] = args; // e.g., 'server/workers/heavy-task.js'

        // ★★★ ФИНАЛЬНОЕ ИЗМЕНЕНИЕ: ПУТЬ К СОБРАННОМУ ФАЙЛУ ★★★
        // Преобразуем путь к воркеру в путь к его собранной, самодостаточной версии.
        const bundledScriptPath = originalScriptPath.replace('server/workers', 'server/workers-dist');
        const fullScriptPath = path.join(APP_ROOT, bundledScriptPath);

        if (!fs.existsSync(fullScriptPath)) {
          throw new Error(`Bundled worker script not found. Did you run "npm run build"? Path: ${fullScriptPath}`);
        }

        const workerId = crypto.randomUUID();
        
        const scriptContent = fs.readFileSync(fullScriptPath, 'utf8');
        const tempFilePath = path.join(WORKERS_TEMP_DIR, `worker-${workerId}.js`);
        fs.writeFileSync(tempFilePath, scriptContent);
        
        // Запускаем временный файл, которому больше не нужны node_modules, потому что все встроено.
        const worker = fork(tempFilePath, [], {
          silent: true
        });

        worker.stdout.on('data', (data) => console.log(`[Worker ${workerId} STDOUT]:`, data.toString().trim()));
        worker.stderr.on('data', (data) => console.error(`[Worker ${workerId} STDERR]:`, data.toString().trim()));

        worker.on('message', (data) => {
          if (win && !win.isDestroyed()) {
            win.webContents.send('longday:worker-message', { workerId, data });
          }
        });

        const workerInfo = { process: worker, tempPath: tempFilePath };
        
        worker.on('exit', (code) => {
          console.log(`Worker ${workerId} has exited with code ${code}. Cleaning up...`);
          activeWorkers.delete(workerId);
          if (fs.existsSync(workerInfo.tempPath)) {
            fs.unlinkSync(workerInfo.tempPath);
            console.log(`Cleaned up temporary worker file: ${workerInfo.tempPath}`);
          }

          if (win && !win.isDestroyed()) {
            if (typeof code === 'number' && code !== 0) {
              win.webContents.send('longday:worker-message', { workerId, data: { type: 'error', message: `Воркер неожиданно завершился с кодом ${code}` } });
            }
            win.webContents.send('longday:worker-exit', { workerId, code });
          }
        });

        worker.on('error', (err) => {
           console.error(`[Worker ${workerId} ERROR]:`, err);
           if (win && !win.isDestroyed()) {
             win.webContents.send('longday:worker-message', { workerId, data: { type: 'error', message: `Произошла критическая ошибка в воркере: ${err.message}` }});
           }
        });

        activeWorkers.set(workerId, workerInfo);
        return { workerId };
      }
      
      case 'postMessageToWorker': {
        const [workerId, message] = args;
        const workerInfo = activeWorkers.get(workerId);
        if (workerInfo) {
          workerInfo.process.send(message);
          return { success: true };
        }
        throw new Error(`Worker with ID ${workerId} not found.`);
      }

      case 'terminateWorker': {
        const [workerId] = args;
        const workerInfo = activeWorkers.get(workerId);
        if (workerInfo) {
          workerInfo.process.kill();
          return { success: true };
        }
        throw new Error(`Worker with ID ${workerId} not found.`);
      }

      default:
        throw new Error(`Unknown core API method: ${method}`);
    }
  }

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

let config;
const apiRegistry = new Map();

async function initialize() {
  const APP_ROOT = app.getAppPath();

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

  const serverUrl = await startLocalServer();
  await createWindow(serverUrl);
}

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

app.whenReady().then(initialize);

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

app.on('will-quit', () => {
  if (fs.existsSync(WORKERS_TEMP_DIR)) {
    fs.rmSync(WORKERS_TEMP_DIR, { recursive: true, force: true });
    console.log('Cleaned up temp worker directory on exit.');
  }
});