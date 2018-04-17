# [DEPRECATED] Ember Data Filter

## Install

### Ember CLI

`ember install ember-data-filter`

### Configuration

```js
//  app/services/store.js
import Store from 'ember-data/store';
import FilterMixin from 'ember-data-filter/mixins/filter';

export default Store.extend(FilterMixin);
```

## Deprecation Guide

### ember-data-filter:filter

You can combine `store.peekAll` with a computed property, for instance:

```js
// app/services/post-service.js
import Ember from 'ember';

export default Ember.Service.extend({
  store: inject.service('store'),
  
  init() {
    this._super();
    this.posts = this.get('store').peekAll('post');
  },

  filteredPosts: Ember.computed('posts.@each.isPublished', function() {
    return this.get('posts').filterBy('isPublished');
  })
});
```

### ember-data-filter:query-for-filter

To resolve this deprecation you will want to separate your usage
of `filter` from your usage of `query`.

Replace

```js
return store.filter(modelName, query, filter, options);
```

with the following if you need to wait for the query

```js
return store.query(modelName, query, options)
  .then(() => {
    return store.filter(modelName, filter);
  });
```

or the below if you do not need to wait for the query

```js
store.query(modelName, query, options);
return store.filter(modelName, filter);
```

### ember-data-filter:empty-filter

Replace `store.filter(modelName)` with `store.peekAll(modelName)`.

The only difference between these two is the `filter` returns a promisfied `RecordArray`
while `peekAll` returns a `RecordArray`. If during the transition you need to
preserve the promise behavior, you may do the below:

```js
return RSVP.Promise.resolve(store.peekAll(modelName));
```

License
------------------------------------------------------------------------------

This project is licensed under the [MIT License](LICENSE.md).
