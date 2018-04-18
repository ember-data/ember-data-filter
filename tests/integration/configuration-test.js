import { module, test } from 'qunit';
import ENV from 'dummy/config/environment';

module('integration/configuration', function() {
  test('sets the configuration variable', function(assert) {
    assert.equal(ENV.EmberENV.ENABLE_DS_FILTER, true);
  });
});
