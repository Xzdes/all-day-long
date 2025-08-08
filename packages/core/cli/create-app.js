#!/usr/bin/env node
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

const templateDir = path.join(__dirname, '..', 'template');

console.log(`Создание нового проекта "${projectName}" в директории ${projectDir}...`);

try {
  fs.mkdirSync(projectDir, { recursive: true });
  fs.cpSync(templateDir, projectDir, { recursive: true });

  // Персонализируем package.json приложения
  const appPackageJsonPath = path.join(projectDir, 'packages', 'app', 'package.json');
  let appPackageJson = JSON.parse(fs.readFileSync(appPackageJsonPath, 'utf8'));
  appPackageJson.name = projectName;
  appPackageJson.description = `The application for the ${projectName} project.`;
  appPackageJson.build.productName = projectName; // Обновляем имя для сборки
  appPackageJson.build.appId = `com.example.${projectName}`; // Обновляем ID
  fs.writeFileSync(appPackageJsonPath, JSON.stringify(appPackageJson, null, 2));

  // Персонализируем корневой package.json
  const rootPackageJsonPath = path.join(projectDir, 'package.json');
  let rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf8'));
  rootPackageJson.name = `${projectName}-monorepo`;
  fs.writeFileSync(rootPackageJsonPath, JSON.stringify(rootPackageJson, null, 2));
  
  // Персонализируем longday.config.js
  const configPath = path.join(projectDir, 'packages', 'app', 'longday.config.js');
  let configFile = fs.readFileSync(configPath, 'utf8');
  configFile = configFile.replace(/My New App/g, projectName);
  fs.writeFileSync(configPath, configFile);

  console.log('\n✅ Проект успешно создан!');
  console.log('\nТеперь выполните следующие команды:');
  console.log(`\n  cd ${projectName}`);
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