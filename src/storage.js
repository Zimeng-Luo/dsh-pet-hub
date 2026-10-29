let pending;
export function database() {
  return pending ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('dsh-pet-hub-v1', 1);
    request.onupgradeneeded = () => { request.result.createObjectStore('packs', { keyPath: 'id' }); request.result.createObjectStore('settings'); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { pending = undefined; reject(request.error); };
    request.onblocked = () => { pending = undefined; reject(new Error('资源库被另一个旧页面占用，请关闭后重试')); };
  });
}
async function transaction(store, mode, operation) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    let request;
    try { request = operation(tx.objectStore(store)); } catch (e) { reject(e); return; }
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = tx.onabort = () => reject(tx.error || new Error('资源库读写失败'));
  });
}
export const storage = {
  list: () => transaction('packs', 'readonly', s => s.getAll()),
  put: pack => transaction('packs', 'readwrite', s => s.put(pack)),
  remove: id => transaction('packs', 'readwrite', s => s.delete(id)),
  settings: async () => await transaction('settings', 'readonly', s => s.get('config')) ?? {},
  save: value => transaction('settings', 'readwrite', s => s.put(value, 'config')),
  core: () => transaction('settings', 'readonly', s => s.get('cubismCore')),
  saveCore: blob => transaction('settings', 'readwrite', s => s.put(blob, 'cubismCore')),
};
