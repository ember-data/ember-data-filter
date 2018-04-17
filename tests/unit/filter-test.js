import { module, test } from 'qunit';
import { FilteredRecordArray } from 'ember-data-filter/mixins/filter';

module('unit/record-arrays/filtered-record-array - DS.FilteredRecordArray');

test('#replace() throws error', function(assert) {
  let recordArray = FilteredRecordArray.create({ modelName: 'recordType' });

  assert.throws(() => {
    recordArray.replace();
  }, Error('The result of a client-side filter (on recordType) is immutable.'), 'throws error');
});
