// packages/core/worker-setup.js
const path = require('path');

// Этот скрипт запускается внутри utilityProcess перед основным скриптом воркера.
// Он получает корневой путь приложения через аргумент командной строки.
// process.argv[0] - это node, process.argv[1] - это наш скрипт, process.argv[2] - первый доп. аргумент.
const appRoot = process.argv[2];

if (appRoot) {
  // Это критически важная часть. Мы программно добавляем
  // папку node_modules приложения в глобальные пути поиска модулей.
  // Этот способ намного надежнее, чем переменная окружения NODE_PATH.
  const appNodeModules = path.join(appRoot, 'node_modules');
  require('module').globalPaths.push(appNodeModules);
}