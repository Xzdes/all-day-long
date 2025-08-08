#!/usr/bin/env node
// packages/core/cli/create-app.js
const fs = require('fs');
const path = require('path');

const projectName = process.argv[2];

if (!projectName) {
  console.error('Ошибка: Пожалуйста, укажите имя для вашего нового проекта.');
  console.log('Пример: npx all-day-long-core my-app');
  process.exit(1);
}

const projectDir = path.resolve(process.cwd(), projectName);

if (fs.existsSync(projectDir)) {
  console.error(`Ошибка: Директория "${projectName}" уже существует.`);
  process.exit(1);
}

// Путь к нашему шаблону. Он должен лежать внутри ядра.
const templateDir = path.join(__dirname, '..', 'template');

console.log(`Создание нового проекта "${projectName}" в директории ${projectDir}...`);

try {
  // 1. Копируем всю структуру шаблона
  fs.mkdirSync(projectDir, { recursive: true });
  fs.cpSync(templateDir, projectDir, { recursive: true });

  // 2. Персонализируем package.json самого приложения
  const appPackageJsonPath = path.join(projectDir, 'packages', 'app', 'package.json');
  let appPackageJson = JSON.parse(fs.readFileSync(appPackageJsonPath, 'utf8'));
  appPackageJson.name = projectName;
  appPackageJson.description = `The application part of the ${projectName} project.`;
  fs.writeFileSync(appPackageJsonPath, JSON.stringify(appPackageJson, null, 2));

  // 3. Персонализируем корневой package.json монорепозитория
  const rootPackageJsonPath = path.join(projectDir, 'package.json');
  let rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf8'));
  rootPackageJson.name = `${projectName}-monorepo`;
  fs.writeFileSync(rootPackageJsonPath, JSON.stringify(rootPackageJson, null, 2));

  console.log('\n✅ Проект успешно создан!');
  console.log('\nТеперь выполните следующие команды:');
  console.log(`\n  cd ${projectName}`);
  console.log('  npm install');
  console.log('  npm run dev\n');

} catch (error) {
  console.error('\n❌ Произошла ошибка во время создания проекта:');
  console.error(error);
  // Попытка очистить за собой в случае ошибки
  if (fs.existsSync(projectDir)) {
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
  process.exit(1);
}