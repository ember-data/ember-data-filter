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


```
ember install my-addon
```


Usage
------------------------------------------------------------------------------

[Longer description of how to use the addon in apps.]


Contributing
------------------------------------------------------------------------------

### Installation

* `git clone <repository-url>`
* `cd my-addon`
* `npm install`

### Linting

* `npm run lint:js`
* `npm run lint:js -- --fix`

### Running tests

* `ember test` – Runs the test suite on the current Ember version
* `ember test --server` – Runs the test suite in "watch mode"
* `ember try:each` – Runs the test suite against multiple Ember versions

### Running the dummy application

* `ember serve`
* Visit the dummy application at [http://localhost:4200](http://localhost:4200).

For more information on using ember-cli, visit [https://ember-cli.com/](https://ember-cli.com/).

License
------------------------------------------------------------------------------

This project is licensed under the [MIT License](LICENSE.md).
