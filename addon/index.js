import Ember from 'ember';
import FilteredRecordArrayManager from './filtered-record-array-manager';
import DS from 'ember-data';

const {Promise} = Ember.RSVP;
const {PromiseArray} = DS;

function promiseArray(promise, label) {
  return PromiseArray.create({
    promise: Promise.resolve(promise, label)
  });
}

export default Ember.Mixin.create({
  init: function(){
    this._super(...arguments);
    // Destroy the default RecordArrayManager in Ember Data and replace with out ow and replace with out own.
    // TOTAL HACK!
    this.recordArrayManager.destroy();
    this.recordArrayManager = FilteredRecordArrayManager.create({
      store: this
    });
  },

  filter: function(modelName, query, filter) {
    Ember.assert('Passing classes to store methods has been removed. Please pass a dasherized string instead of '+ Ember.inspect(modelName), typeof modelName === 'string');
    var promise;
    var length = arguments.length;
    var array;
    var hasQuery = length === 3;

    // allow an optional server query
    if (hasQuery) {
      promise = this.query(modelName, query);
    } else if (arguments.length === 2) {
      filter = query;
    }

    modelName = this.modelFor(modelName);

    if (hasQuery) {
      array = this.recordArrayManager.createFilteredRecordArray(modelName, filter, query);
    } else {
      array = this.recordArrayManager.createFilteredRecordArray(modelName, filter);
    }

    promise = promise || Promise.cast(array);

    return promiseArray(promise.then(function() {
      return array;
    }, null, "DS: Store#filter of " + modelName));
  }
});
