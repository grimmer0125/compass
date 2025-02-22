const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const ipc = require('hadron-ipc');
const { mongoLogId, MongoLogManager } = require('mongodb-log-writer');
const { version } = require('../../package.json');
const debug = require('debug')('mongodb-compass:main:logging');

module.exports = async function setupLogging(app) {
  try {
    const directory = process.platform === 'win32' ?
      path.join(
        process.env.LOCALAPPDATA || process.env.APPDATA || os.homedir(),
        'mongodb',
        'compass') :
      path.join(os.homedir(), '.mongodb', 'compass');

    const manager = new MongoLogManager({
      directory,
      gzip: true,
      alwaysFlush: true,
      retentionDays: 30,
      onerror: (err, filepath) => debug('Failed to access path', filepath, err),
      onwarn: (err, filepath) => debug('Failed to access path', filepath, err)
    });

    await fs.mkdir(directory, { recursive: true });
    const writer = await manager.createLogWriter();

    writer.info('COMPASS-MAIN', mongoLogId(1_001_000_001), 'logging', 'Starting logging', {
      version,
      platform: os.platform(),
      arch: os.arch()
    });

    ipc.on('compass:error:fatal', (evt, meta) => {
      writer.fatal('COMPASS-MAIN', mongoLogId(1_001_000_002), 'app', 'Uncaught exception: ' + meta.message, meta);
    });

    process.prependListener('uncaughtException', (exception) => {
      writer.fatal('COMPASS-MAIN', mongoLogId(1_001_000_002), 'app', 'Uncaught exception: ' + String(exception), {
        message: exception && exception.message,
        stack: exception && exception.stack
      });
    });

    app.on('before-quit', function() {
      writer.info('COMPASS-MAIN', mongoLogId(1_001_000_003), 'app', 'Closing application');
      writer.end();
    });

    process.on('compass:log', (meta) => {
      writer.target.write(meta.line);
    });

    ipc.respondTo('compass:log', (evt, meta) => {
      process.emit('compass:log', meta);
    });

    await manager.cleanupOldLogfiles();
  } catch (err) {
    debug('Failure setting up logging!', err);
  }
};
