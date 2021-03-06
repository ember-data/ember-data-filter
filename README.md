# Ember Data Filter

## Install

### Ember CLI

`ember install ember-data-filter`

### Configuration

To use, you will need to add this mixin to the store. If you are
also using another addon which extends the store, you will want
to ensure that this mixin is applied to the store provided by
that addon.

```js
//  app/services/store.js
import Store from 'ember-data/store';
import FilterMixin from 'ember-data-filter/mixins/filter';

export default Store.extend(FilterMixin);
```

## Recommended Refactor Guide

We recommend that you refactor away from using this addon. Below
 is a short guide for the three `filter` use scenarios and how to
 best refactor each.

Why? Simply put, it's far more performant (and not a memory leak)
 for you to manage filtering yourself via a specialized computed
 property tailored specifically for your needs.

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

To resolve this you will want to separate your usage
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

Copyright (c) 2015-2018
