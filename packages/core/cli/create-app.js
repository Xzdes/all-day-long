#!/usr/bin/env node

const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');

console.log('--- Запуск all-day-long-core create-app ---');

let projectDir;

try {
  const projectNameInput = process.argv[2];

  if (!projectNameInput) {
    console.error('\n❌ Ошибка: Пожалуйста, укажите имя для вашего нового проекта.');
    console.log('Пример: npx all-day-long-core "My Awesome App"\n');
    process.exit(1);
  }

  const projectName = projectNameInput;
  const projectSlug = projectName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const projectAppId = `com.company.${projectSlug}`;

  projectDir = path.resolve(process.cwd(), projectSlug);
  const templateDir = path.join(__dirname, '..', 'template');

  console.log(`Имя проекта: "${projectName}"`);
  console.log(`Папка проекта: ${projectDir}`);
  console.log(`Папка шаблона: ${templateDir}`);

  if (!fs.existsSync(templateDir)) {
    console.error(`\n❌ Критическая ошибка: Папка с шаблонами не найдена по пути: ${templateDir}`);
    process.exit(1);
  }

  if (fs.existsSync(projectDir)) {
    console.error(`\n❌ Ошибка: Директория "${projectSlug}" уже существует.\n`);
    process.exit(1);
  }

  console.log(`\nСоздание нового проекта в директории ${projectDir}...`);

  fse.copySync(templateDir, projectDir);

  console.log('✅ Структура проекта скопирована.');

  // --- Персонализация файлов ---

  const configPath = path.join(projectDir, 'packages', 'app', 'longday.config.js');
  let configFile = fs.readFileSync(configPath, 'utf8');
  configFile = configFile.replace(/productName: '.*?'/, `productName: '${projectName}'`);
  configFile = configFile.replace(/appId: '.*?'/, `appId: '${projectAppId}'`);
  configFile = configFile.replace(/title: ".*?"/, `title: "${projectName}"`);
  fs.writeFileSync(configPath, configFile);
  console.log('✅ Конфигурация приложения настроена.');

  const appPackageJsonPath = path.join(projectDir, 'packages', 'app', 'package.json');
  let appPackageJson = JSON.parse(fs.readFileSync(appPackageJsonPath, 'utf8'));
  
  // ★★★ ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ: УДАЛЯЕМ ПЕРЕИМЕНОВАНИЕ ВНУТРЕННЕГО ПАКЕТА ★★★
  // appPackageJson.name = projectSlug; // Эта строка вызывала ошибку! Мы ее убираем.
  appPackageJson.description = `The application part of the ${projectName} project.`;
  fs.writeFileSync(appPackageJsonPath, JSON.stringify(appPackageJson, null, 2));
  console.log('✅ Пакет приложения настроен.');

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
  console.error('\n❌ Произошла непредвиденная ошибка во время создания проекта:');
  console.error(error);

  if (projectDir && fs.existsSync(projectDir)) {
      console.log('\nОчистка созданных файлов...');
      fs.rmSync(projectDir, { recursive: true, force: true });
  }
  process.exit(1);
}