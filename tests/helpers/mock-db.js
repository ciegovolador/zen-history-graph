/**
 * In-memory mock of GraphDB for testing GraphBuilder and GraphExporter
 * without requiring IndexedDB.
 */
export class MockDB {
  constructor() {
    this.stores = new Map();
    this.stores.set('pages', new Map());
    this.stores.set('entities', new Map());
    this.stores.set('topics', new Map());
    this.stores.set('edges', new Map());
    this.stores.set('metadata', new Map());
  }

  async open() {
    return this;
  }

  async put(storeName, data) {
    const store = this.stores.get(storeName);
    if (!store) throw new Error(`Unknown store: ${storeName}`);
    const keyPath = storeName === 'metadata' ? 'key' : (storeName === 'pages' ? 'url' : 'id');
    store.set(data[keyPath], data);
    return data[keyPath];
  }

  async get(storeName, key) {
    const store = this.stores.get(storeName);
    if (!store) throw new Error(`Unknown store: ${storeName}`);
    return store.get(key) || undefined;
  }

  async getAll(storeName) {
    const store = this.stores.get(storeName);
    if (!store) throw new Error(`Unknown store: ${storeName}`);
    return Array.from(store.values());
  }

  async count(storeName) {
    const store = this.stores.get(storeName);
    if (!store) throw new Error(`Unknown store: ${storeName}`);
    return store.size;
  }

  async delete(storeName, key) {
    const store = this.stores.get(storeName);
    if (!store) throw new Error(`Unknown store: ${storeName}`);
    store.delete(key);
  }

  async clear(storeName) {
    const store = this.stores.get(storeName);
    if (!store) throw new Error(`Unknown store: ${storeName}`);
    store.clear();
  }

  async putMeta(key, value) {
    return this.put('metadata', { key, value, updatedAt: Date.now() });
  }

  async getMeta(key) {
    const result = await this.get('metadata', key);
    return result?.value;
  }
}
