import { hash, all } from 'rsvp';
import { set, get, computed } from '@ember/object';
import { run } from '@ember/runloop';
import setupStore from 'dummy/tests/helpers/store';
import { module, test } from 'qunit';
import DS from 'ember-data';
import customAdapter from 'dummy/tests/helpers/custom-adapter';
import hasEmberVersion from 'ember-test-helpers/has-ember-version';
import {
  addObserver,
  removeObserver
} from '@ember/object/observers';

let store, env, data, recordArray;

const {
  attr,
  belongsTo,
  Model,
  Adapter
} = DS;

const Person = Model.extend({
  name: attr('string'),
  bestFriend: belongsTo('person', { inverse: null, async: false }),
  upperName: computed('name', function() {
    return this.get('name').toUpperCase();
  }).readOnly()
});

module('integration/filter - Model updating', {
  beforeEach() {
    data = [
      {
        id: '1',
        type: 'person',
        attributes: {
          name: 'Scumbag Dale'
        },
        relationships: {
          bestFriend: {
            data: {
              id: '2',
              type: 'person'
            }
          }
        }
      },
      {
        id: '2',
        type: 'person',
        attributes: {
          name: 'Scumbag Katz'
        }
      },
      {
        id: '3',
        type: 'person',
        attributes: {
          name: 'Scumbag Bryn'
        }
      }
    ];

    env = setupStore({ person: Person });
    store = env.store;
  },

  afterEach() {
    edited = null;
    data = null;

    run(store, 'destroy');
  }
});

function tapFn(fn, callback) {
  const old_fn = fn;

  function new_fn() {
    let result = old_fn.apply(this, arguments);
    if (callback) {
      callback.apply(fn, arguments);
    }
    new_fn.summary.called.push(arguments);
    return result;
  }
  new_fn.summary = { called: [] };

  return new_fn;
}

test('when a Model updates its relationships, its changes affect its filtered Array membership', function(assert) {
  run(() => store.push({ data }));

  let people = run(() => {
    return store.filter('person', person => {
      if (person.get('bestFriend') && person.get('bestFriend.name').match(/Katz$/)) {
        return true;
      }
    });
  });

  run(() => assert.equal(get(people, 'length'), 1, 'precond - one item is in the RecordArray'));

  let person = people.objectAt(0);

  assert.equal(get(person, 'name'), 'Scumbag Dale', 'precond - the item is correct');

  run(() => set(person, 'bestFriend', null));

  assert.equal(get(people, 'length'), 0, 'there are now 0 items');

  let erik = store.peekRecord('person', 3);
  let yehuda = store.peekRecord('person', 2);

  run(() => erik.set('bestFriend', yehuda));

  person = people.objectAt(0);
  assert.equal(get(people, 'length'), 1, 'there is now 1 item');
  assert.equal(get(person, 'name'), 'Scumbag Bryn', 'precond - the item is correct');
});

test('a record array can have a filter on it', function(assert) {
  run(() => store.push({ data }));

  let recordArray = run(() => {
    return store.filter('person', hash => {
      if (hash.get('name').match(/Scumbag [KD]/)) {
        return true;
      }
    });
  });

  assert.equal(get(recordArray, 'length'), 2, 'The Record Array should have the filtered objects on it');

  run(() => {
    store.push({
      data: [{
        id: '4',
        type: 'person',
        attributes: {
          name: 'Scumbag Koz'
        }
      }]
    });
  });

  assert.equal(get(recordArray, 'length'), 3, 'The Record Array should be updated as new items are added to the store');

  run(() => {
    store.push({
      data: [{
        id: '1',
        type: 'person',
        attributes: {
          name: 'Scumbag Tom'
        }
      }]
    });
  });

  assert.equal(get(recordArray, 'length'), 2, 'The Record Array should be updated as existing members are updated');
});

test('a filtered record array includes created elements', function(assert) {
  run(() => store.push({ data }));

  let recordArray = run(() => {
    return store.filter('person', hash => {
      if (hash.get('name').match(/Scumbag [KD]/)) {
        return true;
      }
    });
  });

  assert.equal(get(recordArray, 'length'), 2, 'precond - The Record Array should have the filtered objects on it');

  run(() => store.createRecord('person', { name: 'Scumbag Koz' }));

  assert.equal(get(recordArray, 'length'), 3, 'The record array has the new object on it');
});

test('a Record Array can update its filter', function(assert) {
  customAdapter(env, Adapter.extend({
    deleteRecord() {},
    shouldBackgroundReloadRecord() { return false; }
  }));

  run(() => store.push({ data }));

  let dickens = run(() => {
    let record = store.createRecord('person', { id: 4, name: 'Scumbag Dickens' });
    record.deleteRecord();
    return record;
  });

  let asyncData = run(() => {
    return {
      dale: store.findRecord('person', 1),
      katz: store.findRecord('person', 2),
      bryn: store.findRecord('person', 3)
    };
  });

  return store.filter('person', hash => {
    if (hash.get('name').match(/Scumbag [KD]/)) {
      return true;
    }
  }).then(recordArray => {

    return hash(asyncData).then(records => {
      assert.contains(recordArray, records.dale);
      assert.contains(recordArray, records.katz);
      assert.without(recordArray,  dickens);
      assert.without(recordArray,  records.bryn);

      run(() => {
        recordArray.set('filterFunction', hash => {
          if (hash.get('name').match(/Katz/)) {
            return true;
          }
        });
      });

      assert.equal(get(recordArray, 'length'), 1, 'The Record Array should have one object on it');

      run(() => {
        store.push({
          data: [{
            id: '5',
            type: 'person',
            attributes: {
              name: 'Other Katz'
            }
          }]
        });
      });

      assert.equal(get(recordArray, 'length'), 2, 'The Record Array now has the new object matching the filter');

      run(() => {
        store.push({
          data: [{
            id: '6',
            type: 'person',
            attributes: {
              name: 'Scumbag Demon'
            }
          }]
        });
      });

      assert.equal(get(recordArray, 'length'), 2, 'The Record Array doesn\'t have objects matching the old filter');
    });
  });
});

test('it is possible to filter by computed properties', function(assert) {
  customAdapter(env, Adapter.extend({
    shouldBackgroundReloadRecord: () => false
  }));

  let filter = run(() => {
    return store.filter('person', person => person.get('upperName') === 'TOM DALE');
  });

  assert.equal(filter.get('length'), 0, 'precond - the filter starts empty');

  run(() => {
    store.push({
      data: [{
        id: '1',
        type: 'person',
        attributes: {
          name: 'Tom Dale'
        }
      }]
    });
  });

  assert.equal(filter.get('length'), 1, 'the filter now has a record in it');

  return store.findRecord('person', 1).then(person => {
    run(() => {
      person.set('name', 'Yehuda Katz');
    });

    assert.equal(filter.get('length'), 0, 'the filter is empty again');
  });
});

test('a filter created after a record is already loaded works', function(assert) {
  customAdapter(env, Adapter.extend({
    shouldBackgroundReloadRecord() { return false; }
  }));

  run(() => {
    store.push({
      data: [{
        id: '1',
        type: 'person',
        attributes: {
          name: 'Tom Dale'
        }
      }]
    });
  });

  let filter = run(() => {
    return store.filter('person', person => person.get('upperName') === 'TOM DALE');
  });

  assert.equal(filter.get('length'), 1, 'the filter now has a record in it');

  return store.findRecord('person', 1).then(person => {
    assert.equal(filter.objectAt(0), person);
  });
});

test('filter with query persists query on the resulting filteredRecordArray', function(assert) {
  customAdapter(env, Adapter.extend({
    query(store, type, id) {
      return {
        data: [
          {
            id: id,
            type: 'person',
            attributes: {
              name: 'Tom Dale'
            }
          }
        ]
      };
    }
  }));

  let filter = run(() => {
    return store.filter('person', { foo: 1 }, () => true);
  });

  return run(() => {
    return filter.then(array => {
      assert.deepEqual(get(array, 'query'), { foo: 1 }, 'has expected query');
    });
  });
});

test('it is possible to filter by state flags', function(assert) {
  customAdapter(env, Adapter.extend({
    findRecord(store, type, id) {
      return {
        data: {
          id,
          type: 'person',
          attributes: {
            name: 'Tom Dale'
          }
        }
      };
    }
  }));

  let filter = run(() => {
    return store.filter('person', person => person.get('isLoaded'));
  });

  assert.equal(filter.get('length'), 0, 'precond - there are no records yet');

  let person = run(() => {
    let person = store.findRecord('person', 1);

    // run will block `find` from being synchronously
    // resolved in test mode

    assert.equal(filter.get('length'), 0, 'the unloaded record isn\'t in the filter');
    return person;
  });

  return person.then(person => {
    assert.equal(filter.get('length'), 1, 'the now-loaded record is in the filter');
    assert.equal(filter.objectAt(0), person);
  });
});

test('it is possible to filter loaded records by dirtiness', function(assert) {
  customAdapter(env, Adapter.extend({
    updateRecord(type, model, snapshot) {
      return { data: { id: snapshot.id, type: model.modelName } };
    },
    shouldBackgroundReloadRecord() {
      return false;
    }
  }));

  let filter = store.filter('person', person => !person.get('hasDirtyAttributes'));

  run(() => {
    store.push({
      data: [{
        id: '1',
        type: 'person',
        attributes: {
          name: 'Tom Dale'
        }
      }]
    });
  });

  return store.findRecord('person', 1).then(person => {
    assert.equal(filter.get('length'), 1, 'the clean record is in the filter');

    // Force synchronous update of the filter, even though
    // we're already inside a run loop
    run(() => person.set('name', 'Yehuda Katz'));

    assert.equal(filter.get('length'), 0, 'the now-dirty record is not in the filter');

    return person.save();
  }).then(() => {
    assert.equal(filter.get('length'), 1, 'the clean record is back in the filter');
  });
});

test('it is possible to filter created records by dirtiness', function(assert) {
  run(() => {
    customAdapter(env, Adapter.extend({
      createRecord(type, model, snapshot) {
        return {
          data: {
            id: snapshot.id,
            type: model.modelName,
            attributes: snapshot._attributes
          }
        }
      },
      shouldBackgroundReloadRecord() { return false; }
    }));
  });

  let filter = run(() => {
    return store.filter('person', person => !person.get('hasDirtyAttributes'));
  });

  let person = run(() => store.createRecord('person', {
    id: 1,
    name: 'Tom Dale'
  }));

  assert.equal(filter.get('length'), 0, 'the dirty record is not in the filter');

  return run(() => {
    return person.save().then(() => {
      assert.equal(filter.get('length'), 1, 'the clean record is in the filter');
    });
  });
});

if (hasEmberVersion(3, 0)) {
  test('when a Model updates its attributes, its changes affect its filtered Array membership', function(assert) {
    run(() => store.push({ data }));

    let recalculatedArr = 0;
    let recalculatedLen = 0;
    let people = run(() => store.filter('person', hash => {
      return !!hash.get('name').match(/Katz$/);
    }));

    function observeArr() {
      recalculatedArr++;
    }
    function observeLen() {
      recalculatedLen++;
    }

    addObserver(people, '[]', observeArr);
    addObserver(people, 'length', observeLen);

    assert.equal(recalculatedArr, 0, 'precond - We have not yet recalculated membership');
    assert.equal(recalculatedLen, 0, 'precond - We have not yet recalculated length');
    assert.equal(get(people, 'length'), 1, 'precond - one item is in the RecordArray');

    const person = people.objectAt(0);

    assert.equal(get(person, 'name'), 'Scumbag Katz', 'precond - the item is correct');

    run(() => set(person, 'name', 'Yehuda Katz'));

    assert.equal(recalculatedArr, 1, 'We have recalculated membership once');
    assert.equal(recalculatedLen, 0, 'We have not yet recalculated length');
    assert.equal(get(people, 'length'), 1, 'there is still one item');
    assert.equal(get(person, 'name'), 'Yehuda Katz', "it has the updated item");

    run(() => set(person, 'name', 'Yehuda Hats'));

    assert.equal(recalculatedArr, 2, 'We have recalculated twice');
    assert.equal(recalculatedLen, 1, 'We have only recalculated length once');
    assert.equal(get(people, 'query'), null, 'expected no query object set');
    assert.equal(get(people, 'length'), 0, 'there are now no items');
    removeObserver(people, '[]', observeArr);
    removeObserver(people, 'length', observeLen);
  });

  test('a Record Array can update its filter and notify array observers', function(assert) {
    customAdapter(env, Adapter.extend({
      deleteRecord() {},
      shouldBackgroundReloadRecord() { return false; }
    }));

    run(() => store.push({ data }));

    let dickens;

    run(() => {
      dickens = store.createRecord('person', { id: 4, name: 'Scumbag Dickens' });
    });

    let asyncData = run(() => {
      return [
        store.findRecord('person', 1),
        store.findRecord('person', 2),
        store.findRecord('person', 3)
      ];
    });

    let filterPromiseProxy = run(() => store.filter(
      'person',
      hash => !!hash.get('name').match(/Scumbag [KD]/)
    ));

    let recalculatedArr = 0;
    let recalculatedLen = 0;

    function observeArr() { recalculatedArr++; }
    function observeLen() { recalculatedLen++; }

    addObserver(filterPromiseProxy, '[]', observeArr);
    addObserver(filterPromiseProxy, 'length', observeLen);

    return filterPromiseProxy.then((people) => {

      // initial state
      assert.equal(people.get('length'), 3, 'two clean and one new record in the array');
      assert.equal(recalculatedArr, 0, 'No change notifications yet');
      assert.equal(recalculatedLen, 0, 'No change notifications yet');

      // watch deletions
      run(() => { dickens.unloadRecord(); });

      assert.equal(people.get('length'), 2, 'two clean records in the array');

      // TODO make ember-data less noisy
      assert.equal(recalculatedArr, 2, '2 change notifications for 1 deletion');
      assert.equal(recalculatedLen, 2, '2 change notifications for 1 deletion');

      // change up the filter
      run(() => {
        people.set('filterFunction', hash => {
          if (hash.get('name').match(/Katz/)) {
            return true;
          }
        });
      });

      assert.equal(people.get('length'), 1, 'Only one Katz in the array');
      assert.equal(recalculatedArr, 3, '1 more change notifications for filter swap');
      assert.equal(recalculatedLen, 3, '1 more change notifications for filter swap');

      return all(asyncData).then(() => {
        assert.equal(people.get('length'), 1, 'Still only one Katz in the array');
        assert.equal(recalculatedArr, 3, 'no values updated so filters were not rerun');
        assert.equal(recalculatedLen, 3, 'no values updated so filters were not rerun');

        run(() => {
          store.push({
            data: {
              id: '5',
              type: 'person',
              attributes: {
                name: 'Other Katz'
              }
            }
          });
        });

        assert.equal(people.get('length'), 2, 'We added a Katz to the array');
        // TODO make ember-data less noisy, this is likely due to observer causing two
        //   recalculations
        assert.equal(recalculatedArr, 5, '1 more change notifications for add');
        assert.equal(recalculatedLen, 5, '1 more change notifications for add');
        assert.deepEqual(people.map(p => p.get('name')), ['Scumbag Katz', 'Other Katz'], 'We have the right people');

        run(() => {
          store.push({
            data: {
              id: '6',
              type: 'person',
              attributes: {
                name: 'Scumbag Demon'
              }
            }
          });
        });

        assert.equal(people.get('length'), 2, 'We had no change to the array');
        // TODO make ember-data less noisy, this is likely due to observer causing two
        //   recalculations
        assert.equal(recalculatedArr, 7, '1 more change notifications for add-caused filter-rerun');
        assert.equal(recalculatedLen, 5, 'no more change notifications, as length did not change');

        removeObserver(filterPromiseProxy, '[]', observeArr);
        removeObserver(filterPromiseProxy, 'length', observeLen);
      });
    });
  });
}

// SERVER SIDE TESTS
let edited;

function clientEdits(ids) {
  edited = [];

  ids.forEach(id => {
    // wrap in an run to guarantee coalescence of the
    // iterated `set` calls and promise resolution.
    run(() => {
      store.findRecord('person', id).then(person => {
        edited.push(person);
        person.set('name', 'Client-side ' + id );
      });
    });
  });
}

function clientCreates(names) {
  // wrap in an run to guarantee coalescence of the
  // iterated `set` calls.
  run(() => {
    edited = names.map(name => store.createRecord('person', { name: 'Client-side ' + name }));
  });
}

function serverResponds() {
  edited.forEach(person => run(person, 'save'));
}

function setup(assert, serverCallbacks) {
  customAdapter(env, Adapter.extend(serverCallbacks));

  run(() => {
    store.push({ data });

    recordArray = store.filter('person', hash => {
      if (hash.get('name').match(/Scumbag/)) {
        return true;
      }
    });
  });

  assert.equal(get(recordArray, 'length'), 3, 'The filter function should work');
}

test('a Record Array can update its filter after server-side updates one record', function(assert) {
  setup(assert, {
    updateRecord() {
      return {
        data: {
          id: 1,
          type: 'person',
          attributes: {
            name: 'Scumbag Server-side Dale'
          }
        }
      };
    },
    shouldBackgroundReloadRecord() { return false; }
  });

  clientEdits([1]);
  assert.equal(get(recordArray, 'length'), 2, 'The record array updates when the client changes records');

  serverResponds();
  assert.equal(get(recordArray, 'length'), 3, 'The record array updates when the server changes one record');
});

test('a Record Array can update its filter after server-side updates multiple records', function(assert) {
  setup(assert, {
    updateRecord(store, type, snapshot) {
      switch (snapshot.id) {
        case '1':
          return {
            data: {
              id: 1,
              type: 'person',
              attributes: {
                name: 'Scumbag Server-side Dale'
              }
            }
          };
        case '2':
          return {
            data: {
              id: 2,
              type: 'person',
              attributes: {
                name: 'Scumbag Server-side Katz'
              }
            }
          };
      }
    },
    shouldBackgroundReloadRecord() { return false; }
  });

  clientEdits([1, 2]);
  assert.equal(get(recordArray, 'length'), 1, 'The record array updates when the client changes records');

  serverResponds();
  assert.equal(get(recordArray, 'length'), 3, 'The record array updates when the server changes multiple records');
});

test('a Record Array can update its filter after server-side creates one record', function(assert) {
  setup(assert, {
    createRecord() {
      return {
        data: {
          id: 4,
          type: 'person',
          attributes: {
            name: 'Scumbag Server-side Tim'
          }
        }
      };
    }
  });

  clientCreates(['Tim']);
  assert.equal(get(recordArray, 'length'), 3, 'The record array does not include non-matching records');

  serverResponds();
  assert.equal(get(recordArray, 'length'), 4, 'The record array updates when the server creates a record');
});

test('a Record Array can update its filter after server-side creates multiple records', function(assert) {
  setup(assert, {
    createRecord(store, type, snapshot) {
      switch (snapshot.attr('name')) {
        case 'Client-side Mike':
          return {
            data: {
              id: 4,
              type: 'person',
              attributes: {
                name: 'Scumbag Server-side Mike'
              }
            }
          };
        case 'Client-side David':
          return {
            data: {
              id: 5,
              type: 'person',
              attributes: {
                name: 'Scumbag Server-side David'
              }
            }
          };
      }
    }
  });

  clientCreates(['Mike', 'David']);
  assert.equal(get(recordArray, 'length'), 3, 'The record array does not include non-matching records');

  serverResponds();
  assert.equal(get(recordArray, 'length'), 5, 'The record array updates when the server creates multiple records');
});

test('a Record Array can update its filter after server-side creates multiple records', function(assert) {
  setup(assert, {
    createRecord(store, type, snapshot) {
      switch (snapshot.attr('name')) {
        case 'Client-side Mike':
          return {
            data: {
              id: 4,
              type: 'person',
              attributes: {
                name: 'Scumbag Server-side Mike'
              }
            }
          };
        case 'Client-side David':
          return {
            data: {
              id: 5,
              type: 'person',
              attributes: {
                name: 'Scumbag Server-side David'
              }
            }
          };
      }
    }
  });

  clientCreates(['Mike', 'David']);
  assert.equal(get(recordArray, 'length'), 3, 'The record array does not include non-matching records');

  serverResponds();
  assert.equal(get(recordArray, 'length'), 5, 'The record array updates when the server creates multiple records');
});

test('destroying filteredRecordArray unregisters models from being filtered', function(assert) {
  const filterFn = tapFn(() => true);

  let recalculatedArr = 0;
  let recalculatedLen = 0;

  function observeArr() {
    recalculatedArr++;
  }
  function observeLen() {
    recalculatedLen++;
  }

  customAdapter(env, Adapter.extend({
    shouldBackgroundReloadRecord() { return false; }
  }));

  run(() => {
    store.push({
      data: [{
        id: '1',
        type: 'person',
        attributes: {
          name: 'Tom Dale'
        }
      }]
    });
  });

  const people = run(() => store.filter('person', filterFn));

  addObserver(people, '[]', observeArr);
  addObserver(people, 'length', observeLen);

  assert.equal(filterFn.summary.called.length, 1);

  run(() => people.then(array => array.destroy()));

  clientEdits([1]);
  run(() => {
    store.push({
      data: {
        id: '2',
        type: 'person',
        attributes: {
          name: '@runspired'
        }
      }
    });
  });

  assert.equal(filterFn.summary.called.length, 1, 'expected the filter function not being called anymore');

  removeObserver(people, '[]', observeArr);
  removeObserver(people, 'length', observeLen);
  assert.equal(recalculatedArr, 0, 'We did not update content');
  assert.equal(recalculatedLen, 0, 'We did not update length');
});

test("store.filter should pass adapterOptions to adapter.query", function(assert) {
  assert.expect(2);

  env.adapter.query = function(store, type, query, array, options) {
    assert.ok(!('adapterOptions' in query));
    assert.deepEqual(options.adapterOptions, { query: { embed: true } });
    return { data: [] };
  };

  return run(() => {
    return store.filter('person', {}, () => {}, { adapterOptions: { query: { embed: true } } });
  });
});

test('unloading filtered records', function(assert) {
  function push() {
    run(() => {
      store.push({
        data: [
          {
            type: 'person',
            id: '1',
            attributes: {
              name: 'Scumbag John'
            }
          },
          {
            type: 'person',
            id: '2',
            attributes: {
              name: 'Scumbag Joe'
            }
          }
        ]
      });
    });
  }

  let people = run(() => {
    return store.filter('person', hash => {
      if (hash.get('name').match(/Scumbag/)) {
        return true;
      }
    });
  });

  assert.equal(get(people, 'length'), 0, 'precond - no items in the RecordArray');

  push();

  assert.equal(get(people, 'length'), 2, 'precond - two items in the RecordArray');

  run(() => {
    people.objectAt(0).unloadRecord();

    assert.equal(get(people, 'length'), 2, 'Unload does not complete until the end of the loop');
    assert.equal(get(people.objectAt(0), 'name'), 'Scumbag John', 'John is still the first object until the end of the loop');
  });

  assert.equal(get(people, 'length'), 1, 'Unloaded record removed from the array');
  assert.equal(get(people.objectAt(0), 'name'), 'Scumbag Joe', 'Joe shifted down after the unload');
});


