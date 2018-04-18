import { computed } from '@ember/object';
import Mixin from '@ember/object/mixin';
import PromiseProxyMixin from '@ember/object/promise-proxy-mixin';
import ArrayProxy from '@ember/array/proxy';
import { assert, deprecate } from '@ember/debug';
import { Promise } from 'rsvp';
import DS from 'ember-data';

const PromiseArray = ArrayProxy.extend(PromiseProxyMixin);

export const FilteredRecordArray = ArrayProxy.extend({
  replace() {
    throw new Error('The result of a client-side filter (on recordType) is immutable.');
  },

  content: computed('all.[]', 'filterFunction', function() {
    let all = this.get('all');
    let filter = this.get('filterFunction');
    let allRecords = all ? all.toArray() : [];

    return allRecords.filter((record) => {
      return record !== null && filter(record);
    });
  }),
});

/*
  Necessary because LiveRecordArrays do not produce change notifications
  for updates to items, only if an item is added or removed are we notified.

  However, the `updateLiveRecordArray` method is called for internal updates
  as well, so by hooking this we can ensure we are subscribed.
 */
const originalUpdateLiveRecordArray = DS.RecordArrayManager.prototype.updateLiveRecordArray;
DS.RecordArrayManager.prototype.updateLiveRecordArray = function updateLiveRecordArray(recordArray, internalModels) {
  let didUpdate = originalUpdateLiveRecordArray.call(this, recordArray, internalModels);

  if (!didUpdate) {
    this.store._notifyFilteredRecordArrays(recordArray.modelName);
  }

  return didUpdate;
};

export default Mixin.create({
  init() {
    this._super();
    this._filteredRecordArrayCache = new Map();
  },

  willDestroy() {
    this._super(...arguments);
    this._filteredRecordArrayCache.forEach(recordArrays => {
      recordArrays.forEach(arr => arr.destroy());
    });
  },

  _notifyFilteredRecordArrays(modelName) {
    let recordArrays = this._filteredRecordArraysFor(modelName);

    for (let i = 0; i < recordArrays.length; i++) {
      let arr = recordArrays[i];
      arr.notifyPropertyChange('all');
    }
  },

  _filteredRecordArraysFor(modelName) {
    let map = this._filteredRecordArrayCache;
    let arrays = map.get(modelName);

    if (!arrays) {
      arrays = [];
      map.set(modelName, arrays);
    }

    return arrays;
  },

  /**
   Takes a type and filter function, and returns a live RecordArray that
   remains up to date as new records are loaded into the store or created
   locally.

   The filter function takes a materialized record, and returns true
   if the record should be included in the filter and false if it should
   not.

   Example

   ```javascript
   store.filter('post', function(post) {
      return post.get('unread');
    });
   ```

   The filter function is called once on all records for the type when
   it is created, and then once on each newly loaded or created record.

   If any of a record's properties change, or if it changes state, the
   filter function will be invoked again to determine whether it should
   still be in the array.

   Optionally you can pass a query, which is the equivalent of calling
   [query](#method_query) with that same query, to fetch additional records
   from the server. The results returned by the server could then appear
   in the filter if they match the filter function.

   The query itself is not used to filter records, it's only sent to your
   server for you to be able to do server-side filtering. The filter
   function will be applied on the returned results regardless.

   Example

   ```javascript
   store.filter('post', { unread: true }, function(post) {
      return post.get('unread');
    }).then(function(unreadPosts) {
      unreadPosts.get('length'); // 5
      let unreadPost = unreadPosts.objectAt(0);
      unreadPost.set('unread', false);
      unreadPosts.get('length'); // 4
    });
   ```

   @method filter
   @private
   @param {String} modelName
   @param {Object} query optional query
   @param {Function} filter
   @param {Object} options optional, options to be passed to store.query
   @return {PromiseArray}
   @deprecated
   */
  filter(modelName, query, filter, options) {
    assert(`You need to pass a model name to the store's filter method`, modelName);
    assert(`Passing classes to store methods has been removed. Please pass a dasherized string instead of ${modelName}`, typeof modelName === 'string');

    deprecate(
      `store.filter has been deprecated in favor of computed properties that watch record arrays.`,
      typeof filter === 'string',
      {
        id: 'ember-data-filter:filter',
        until: '3.5',
        url: 'https://github.com/ember-data/ember-data-filter#ember-data-filter:filter'
      });

    let promise;
    let length = arguments.length;
    let hasQuery = length >= 3;

    // allow an optional server query
    if (hasQuery) {
      deprecate(`passing a query to ember-data-filter's filter method has been deprecated`, false, {
        id: 'ember-data-filter:query-for-filter',
        until: '3.5',
        url: 'https://github.com/ember-data/ember-data-filter#ember-data-filter:query-for-filter'
      });
      promise = this.query(modelName, query, options);
    } else if (arguments.length === 2) {
      filter = query;
    } else {
      filter = () => true;
    }

    deprecate(
      `No filter was provided in a call to store.filter(${modelName}). To filter to all of a type, use store.peekAll`,
      filter !== '',
      {
        id: 'ember-data-filter:empty-filter',
        until: '3.5',
        url: 'https://github.com/ember-data/ember-data-filter#ember-data-filter:empty-filter'
      });

    let all = this.peekAll(modelName);
    let normalizedModelName = all.modelName;
    let array = FilteredRecordArray.create({
      query,
      modelName: normalizedModelName,
      all,
      filterFunction: filter
    });

    this._filteredRecordArraysFor(normalizedModelName).push(array);

    promise = promise || Promise.resolve(array);
    promise = Promise.resolve(promise.then(() => array, null, `DS: Store#filter of ${normalizedModelName}`));

    return PromiseArray.create({
      promise
    });
  },
});
