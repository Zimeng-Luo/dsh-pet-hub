import { assetURLs, parseModel, resolveReference } from '../catalog.js';
import { ensureCore } from './core.js';
import { storage } from '../storage.js';
import { mverProfile } from './mver.js';
// Reuses BongoCat's web engine; replaces its Tauri IO and window ownership.
export const bongoAdapter = {
  id: 'bongocat-live2d',
  async mount({ pack, entry, element }) {
    await ensureCore(await storage.core());
    const { mountBongo } = await import('./bongocat-engine.js');
    const urls = assetURLs(pack);
    try {
      const file = pack.files.find(f => f.path === entry.path), modelJSON = parseModel(await file.blob.text());
      return await mountBongo({ pack, entry, element, modelJSON, urls, resolveReference, profile: await mverProfile(pack, entry) });
    } catch (e) { urls.dispose(); throw e; }
  },
};
