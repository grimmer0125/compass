import { Plugin } from 'hadron-plugin-manager';

const corePlugin = new Plugin(__dirname);
corePlugin.isActivated = true;
corePlugin.error = undefined;
corePlugin.metadata = {
  'name': '@mongodb-js/core-plugin',
  'productName': 'Core Plugin',
  'version': '0.0.7',
  'description': 'A Sample Core MongoDB Compass Plugin',
  'main': 'index.js'
};

const extPlugin = new Plugin(__dirname);
extPlugin.isActivated = true;
extPlugin.error = undefined;
extPlugin.metadata = {
  'name': 'external-plugin',
  'productName': 'External Plugin',
  'version': '1.0.0',
  'description': 'A Sample External MongoDB Compass Plugin',
  'main': 'index.js'
};

export { corePlugin, extPlugin };
