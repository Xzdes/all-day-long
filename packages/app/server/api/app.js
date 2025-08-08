// packages/app/server/api/app.js
const path = require('path');

// Мы можем безопасно импортировать конфиг здесь, так как это серверный код.
// Node.js кеширует require, так что это не будет накладно.
const appConfig = require('../../longday.config.js');

/**
 * Возвращает публичную, безопасную для клиента часть конфигурации.
 */
async function getPublicConfig() {
  console.log('[API app.getPublicConfig] Sending public config to client.');
  return {
    // Мы отправляем только то, что нужно для UI
    window: {
      title: appConfig.window.title || 'App',
    }
  };
}

module.exports = {
  getPublicConfig,
};