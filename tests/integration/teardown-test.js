import { run } from '@ember/runloop';
import setupStore from 'dummy/tests/helpers/store';
import { module, test } from 'qunit';
import DS from 'ember-data';

const Person = DS.Model.extend({
  name: DS.attr('string'),
});

module("integration/store - destroy", {
  beforeEach() {
    this.store = setupStore({
      person: Person
    }).store;
  },
});

function tap(obj, methodName, callback) {
  let old = obj[methodName];

  let summary = { called: [] };

  obj[methodName] = function() {
    let result = old.apply(obj, arguments);
    if (callback) {
      callback.apply(obj, arguments);
    }
    summary.called.push(arguments);
    return result;
  };

  return summary;
}

test("destroying the store correctly cleans up filters", function(assert) {
  let store = this.store;
  let filterdPeople = run(() => store.filter('person', () => true));
  let filter = filterdPeople.get('content');
  let filterdPeopleWillDestroy = tap(filter, 'willDestroy');

  assert.equal(filterdPeopleWillDestroy.called.length, 0, 'expected filterdPeople.willDestroy to not have been called');

  run(store, 'destroy');

  assert.equal(filter.isDestroying, true, 'We marked the filter for destroy');
  assert.equal(filter.isDestroyed, true, 'We destroyed the filter');
  assert.equal(filterdPeopleWillDestroy.called.length, 1, 'expected filterdPeople.willDestroy to have been called once');
});
