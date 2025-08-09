// packages/app/esbuild.workers.js
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const workersDir = path.join(__dirname, 'server', 'workers');
const outDir = path.join(__dirname, 'server', 'workers-dist');

// Создаем директорию для вывода, если ее нет
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Находим все .js файлы в директории воркеров
const entryPoints = fs.readdirSync(workersDir)
  .filter(file => file.endsWith('.js'))
  .map(file => path.join(workersDir, file));

if (entryPoints.length === 0) {
    console.log('No worker files found to build.');
    return;
}

console.log('Building self-contained workers:', entryPoints);

// Запускаем сборку
esbuild.build({
  entryPoints,
  bundle: true, // ★★★ Это главная команда: "собери все зависимости в один файл"
  outdir: outDir,
  platform: 'node', // Указываем, что собираем для среды Node.js
  target: `node${process.versions.node}`, // Целевая версия Node.js
  format: 'cjs', // Собираем в стандартном для Node.js формате CommonJS
  external: ['electron'], // Исключаем 'electron' из сборки, он будет доступен в среде
}).catch((err) => {
    console.error("Worker build failed:", err);
    process.exit(1);
});