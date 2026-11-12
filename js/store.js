// On-device storage (IndexedDB). Entries are kept here already encrypted.
let db;

export function open(name) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('entries', { keyPath: 'id' });
      req.result.createObjectStore('kv');
    };
    req.onsuccess = () => { db = req.result; resolve(); };
    req.onerror = () => reject(req.error);
  });
}

function run(storeName, mode, fn) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const req = fn(tx.objectStore(storeName));
    tx.oncomplete = () => resolve(req ? req.result : undefined);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const getKV = (k) => run('kv', 'readonly', (s) => s.get(k));
export const setKV = (k, v) => run('kv', 'readwrite', (s) => s.put(v, k));
export const delKV = (k) => run('kv', 'readwrite', (s) => s.delete(k));
export const allEntries = () => run('entries', 'readonly', (s) => s.getAll());
export const getEntry = (id) => run('entries', 'readonly', (s) => s.get(id));
export const putEntry = (e) => run('entries', 'readwrite', (s) => s.put(e));
// add() fails if the id already exists: a locked-in entry can never be overwritten.
export const addEntry = (e) => run('entries', 'readwrite', (s) => s.add(e));
