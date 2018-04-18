import FilterMixin from 'ember-data-filter/mixins/filter';
import { dasherize } from '@ember/string';
import Ember from 'ember';
import DS from 'ember-data';
import Owner from './owner';

export default function setupStore(options) {
  let container, registry, owner;
  let env = {};
  options = options || {};

  if (Ember.Registry) {
    registry = env.registry = new Ember.Registry();
    owner = Owner.create({
      __registry__: registry
    });
    container = env.container = registry.container({
      owner: owner
    });
    owner.__container__ = container;
  } else {
    container = env.container = new Ember.Container();
    registry = env.registry = container;
  }

  env.replaceContainerNormalize = function replaceContainerNormalize(fn) {
    if (env.registry) {
      env.registry.normalize = fn;
    } else {
      env.container.normalize = fn;
    }
  };

  let adapter = env.adapter = (options.adapter || '-default');
  delete options.adapter;

  if (typeof adapter !== 'string') {
    env.registry.register('adapter:-ember-data-test-custom', adapter);
    adapter = '-ember-data-test-custom';
  }

  for (let prop in options) {
    registry.register('model:' + dasherize(prop), options[prop]);
  }

  registry.register('service:store', DS.Store.extend(FilterMixin, {
    adapter: adapter
  }));

  registry.optionsForType('serializer', { singleton: false });
  registry.optionsForType('adapter', { singleton: false });
  registry.register('adapter:-default', DS.Adapter);

  registry.register('serializer:-default', DS.JSONAPISerializer);
  registry.register('serializer:-json', DS.JSONSerializer);
  registry.register('serializer:-rest', DS.RESTSerializer);

  registry.register('adapter:-rest', DS.RESTAdapter);
  registry.register('adapter:-json-api', DS.JSONAPIAdapter);

  registry.injection('serializer', 'store', 'service:store');

  env.store = container.lookup('service:store');
  env.restSerializer = container.lookup('serializer:-rest');
  env.restSerializer.store = env.store;
  env.serializer = env.store.serializerFor('-default');
  env.serializer.store = env.store;
  // lazily create the adapter method because some tets depend on
  // modifiying the adapter in the container after setupStore is
  // called
  Object.defineProperty(env, 'adapter', {
    get() {
      if (!this._adapter) {
        this._adapter = this.store.adapterFor('application');
      }
      return this._adapter;
    },
    set(adapter) {
      this._adapter = adapter;
    },
    enumerable: true,
    configurable: true
  });

  return env;
}

export { setupStore };

export function createStore(options) {
  return setupStore(options).store;
}
