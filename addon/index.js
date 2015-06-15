import Ember from 'ember';

const {MapWithDefault} = Ember;

const FilterMixin = Ember.Mixin.create({
  init() {
    this._super(...arguments);
    this._filteredRecordArrays = MapWithDefault.create({
      defaultValue: function() {
        return [];
      }
    });
  },

  _createFilteredRecordArray(typeClass, filter, query) {

  },

  _registerFilteredRecordArray(array, typeClass) {
    var recordArrays = this._filteredRecordArrays.get(typeClass);
    recordArrays.push(array);

    this._updateFilter(array, typeClass, filter);
  },

  _updateFilter(array, modelName, filter) {
    var typeMap = this.typeMapFor(modelName);
    var records = typeMap.records;
    var record;

    for (var i = 0, l = records.length; i < l; i++) {
      record = records[i];

      if (!record.isDeleted() && !record.isEmpty()) {
        this.updateFilterRecordArray(array, filter, modelName, record);
      }
    }
  },

  filter() {
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

export default FilterMixin;
