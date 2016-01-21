var assert = require('assert');
var helpers = require('./helpers');

describe('keytar', function() {
  it('should be requirable', function() {
    assert.doesNotThrow(function() {
      require('keytar');
    });
  });

  it('should be requirable in Electron', function(done) {
    helpers.requireInElectron('keytar', 'getPassword',
                              function(err) { done(err); });
  });
});
