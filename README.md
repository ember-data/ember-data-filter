# Ember Data Filter

## Install

### Ember CLI

`ember install ember-data-filter`

### Rails and Globals Mode apps

You'll need to load a custom script that enables the script **before you
load Ember**. For example, if you call your file config.js:

```js
// /config.js

window.EmberENV = window.EmberENV || {};
window.EmberENV.ENABLE_DS_FILTER = true;
```

If you're using Rails, you can use a Sprockets require directive to load
this before ember:

```
// app/assets/application.js
//= require jquery
//= require config
//= require ember
// .. the rest of your require / file here ..
```

If you're loading ember using script tags, then you can simply load
config.js first:

```html
<script src="jquery.js"></script>
<script src="config.js"></script>
<script src-"ember.js"></script>
```


This addon enables the `Ember.EmberENV.ENABLE_DS_FILTER` flag. This
allows you to use `store.filter` without getting a deprecation warning
in Ember Data 1.13 and 2.0.

## Why?

The Filter API is about to under-go some heavy churn to fix issues with
it.

## I Don't Want to Enable this Feature Due to Its Heavy Churn

You can combine `store.peekAll` in a computed property:

```js
// app/controllers/posts.js

export default Ember.Controller.extend({

  posts: Ember.computed(function() {
    return this.store.peekAll('post');
  }),

  filteredPosts: Ember.computed('posts.@each.isPublished', function() {
    return this.get('posts').filterBy('isPublished');
  })
});
```

## Development Installation

* `git clone` this repository
* `npm install`
* `bower install`

## Running

* `ember server`
* Visit your app at http://localhost:4200.

## Running Tests

* `ember test`
* `ember test --server`

## Building

* `ember build`

For more information on using ember-cli, visit [http://www.ember-cli.com/](http://www.ember-cli.com/).
