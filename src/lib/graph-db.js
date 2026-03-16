const DB_NAME = 'zen-history-graph';
const DB_VERSION = 2;

export class GraphDB {
  constructor() {
    this.db = null;
  }

  open() {
    if (this.db) return Promise.resolve(this.db);

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Pages store
        if (!db.objectStoreNames.contains('pages')) {
          const pages = db.createObjectStore('pages', { keyPath: 'url' });
          pages.createIndex('domain', 'domain', { unique: false });
          pages.createIndex('lastVisited', 'lastVisited', { unique: false });
        }

        // Entities store
        if (!db.objectStoreNames.contains('entities')) {
          const entities = db.createObjectStore('entities', { keyPath: 'id' });
          entities.createIndex('name', 'name', { unique: false });
          entities.createIndex('type', 'type', { unique: false });
        }

        // Topics store
        if (!db.objectStoreNames.contains('topics')) {
          const topics = db.createObjectStore('topics', { keyPath: 'id' });
          topics.createIndex('name', 'name', { unique: false });
          topics.createIndex('score', 'score', { unique: false });
        }

        // Edges store
        if (!db.objectStoreNames.contains('edges')) {
          const edges = db.createObjectStore('edges', { keyPath: 'id' });
          edges.createIndex('type', 'type', { unique: false });
          edges.createIndex('source', 'source', { unique: false });
          edges.createIndex('target', 'target', { unique: false });
        }

        // Remove chunks store if it exists from a previous version
        if (db.objectStoreNames.contains('chunks')) {
          db.deleteObjectStore('chunks');
        }

        // Metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        reject(new Error('Failed to open database: ' + event.target.error));
      };
    });
  }

  async put(storeName, data) {
    await this.open();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get(storeName, key) {
    await this.open();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName) {
    await this.open();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllByIndex(storeName, indexName, value) {
    await this.open();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async count(storeName) {
    await this.open();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName, key) {
    await this.open();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName) {
    await this.open();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async putMeta(key, value) {
    return this.put('metadata', { key, value, updatedAt: Date.now() });
  }

  async getMeta(key) {
    const result = await this.get('metadata', key);
    return result?.value;
  }
}
