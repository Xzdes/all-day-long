const path = require('path');

module.exports = {
  app: {
    productName: 'My New App',
  },
  window: {
    width: 800,
    height: 600,
    title: 'My New App',
  },
  apiPath: path.join(__dirname, 'server', 'api'),
  publicPath: path.join(__dirname, 'public'),
};