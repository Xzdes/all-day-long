#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const projectNameInput = process.argv[2];

if (!projectNameInput) {
  console.error('Ошибка: Пожалуйста, укажите имя для вашего нового проекта.');
  console.log('Пример: npx all-day-long-core "My Awesome App"');
  process.exit(1);
}

// --- Умная обработка имени проекта ---
const projectName = projectNameInput; // "My Awesome App"
const projectSlug = projectName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''); // "my-awesome-app"
const projectAppId = `com.company.${projectSlug}`; // "com.company.my-awesome-app"

const projectDir = path.resolve(process.cwd(), projectSlug);

if (fs.existsSync(projectDir)) {
  console.error(`Ошибка: Директория "${projectSlug}" уже существует.`);
  process.exit(1);
}

const templateDir = path.join(__dirname, '..', 'template');

console.log(`Создание нового проекта "${projectName}" в директории ${projectDir}...`);

try {
  // Копируем всю структуру шаблона
  fs.mkdirSync(projectDir, { recursive: true });
  fs.cpSync(templateDir, projectDir, { recursive: true });

  // --- Персонализация файлов ---

  // 1. Конфигурация приложения: packages/app/longday.config.js
  const configPath = path.join(projectDir, 'packages', 'app', 'longday.config.js');
  let configFile = fs.readFileSync(configPath, 'utf8');
  configFile = configFile.replace(/productName: '.*?'/, `productName: '${projectName}'`);
  configFile = configFile.replace(/appId: '.*?'/, `appId: '${projectAppId}'`);
  configFile = configFile.replace(/title: ".*?"/, `title: "${projectName}"`);
  fs.writeFileSync(configPath, configFile);
  console.log('✅ Конфигурация приложения настроена.');

  // 2. Файл пакета приложения: packages/app/package.json
  const appPackageJsonPath = path.join(projectDir, 'packages', 'app', 'package.json');
  let appPackageJson = JSON.parse(fs.readFileSync(appPackageJsonPath, 'utf8'));
  appPackageJson.name = projectSlug; // Имя пакета должно быть в нижнем регистре без пробелов
  appPackageJson.description = `The application for the ${projectName} project.`;
  fs.writeFileSync(appPackageJsonPath, JSON.stringify(appPackageJson, null, 2));
  console.log('✅ Пакет приложения настроен.');
  
  // 3. Конфигурация сборщика: packages/app/electron-builder.config.js
  const builderConfigPath = path.join(projectDir, 'packages', 'app', 'electron-builder.config.js');
  // Этот файл уже читает данные из longday.config.js, так что его можно не трогать,
  // но на всякий случай оставим лог, чтобы показать, что мы о нем помним.
  if (fs.existsSync(builderConfigPath)) {
      console.log('✅ Конфигурация сборщика готова к работе.');
  }

  // 4. Корневой package.json монорепозитория
  const rootPackageJsonPath = path.join(projectDir, 'package.json');
  let rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf8'));
  rootPackageJson.name = `${projectSlug}-monorepo`;
  fs.writeFileSync(rootPackageJsonPath, JSON.stringify(rootPackageJson, null, 2));
  console.log('✅ Корневой пакет монорепозитория настроен.');

  console.log('\n🚀 Проект успешно создан!');
  console.log('\nТеперь выполните следующие команды, чтобы запустить ваше новое приложение:');
  console.log(`\n  cd ${projectSlug}`);
  console.log('  npm install');
  console.log('  npm run dev\n');

} catch (error) {
  console.error('\n❌ Произошла ошибка во время создания проекта:');
  console.error(error);
  if (fs.existsSync(projectDir)) {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
  process.exit(1);
}