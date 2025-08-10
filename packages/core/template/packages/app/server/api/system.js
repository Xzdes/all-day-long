// packages/app/server/api/system.js
const os = require('os');

async function getSystemInfo() {
  console.log('[API system.getSystemInfo] Function was called from React!');
  return {
    cpu: os.cpus()[0].model,
    freemem: `${(os.freemem() / 1024 / 1024).toFixed(2)} MB`,
    platform: os.platform(),
  };
}

async function greet(name) {
  if (!name) {
    throw new Error("Имя не было предоставлено!");
  }
  return `Привет, ${name}! Это сообщение сгенерировано на сервере в Node.js.`;
}

module.exports = {
  getSystemInfo,
  greet,
};