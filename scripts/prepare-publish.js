const fse = require('fs-extra');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const coreDir = path.join(rootDir, 'packages', 'core');
const appDir = path.join(rootDir, 'packages', 'app');
const templateDir = path.join(coreDir, 'template');

const templatePackagesDir = path.join(templateDir, 'packages');
const templateAppDir = path.join(templatePackagesDir, 'app');
const templateCoreDir = path.join(templatePackagesDir, 'core');

console.log('--- Preparing all-day-long-core for publish ---');

try {
  // 1. Очищаем старые версии пакетов в шаблоне
  console.log('Cleaning old template directories...');
  fse.rmSync(templatePackagesDir, { recursive: true, force: true });
  fse.ensureDirSync(templatePackagesDir);

  // 2. Копируем пакет 'app' в шаблон
  console.log(`Copying 'app' package to template...`);
  fse.copySync(appDir, templateAppDir, {
    filter: (src) => !src.includes('node_modules') && !src.includes('dist')
  });

  // 3. Копируем пакет 'core' в шаблон
  console.log(`Copying 'core' package to template...`);
  fse.copySync(coreDir, templateCoreDir, {
    filter: (src) => !src.includes('node_modules') && !src.includes('template')
  });

  console.log('✅ Template prepared successfully!');

} catch (error) {
  console.error('❌ Failed to prepare template:', error);
  process.exit(1);
}