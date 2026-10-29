import { assetURLs } from '../catalog.js';
export const imageAdapter = {
  id: 'image',
  async mount({ pack, entry, element }) {
    const urls = assetURLs(pack), img = document.createElement('img');
    img.className = 'dph-image'; img.alt = entry.label; img.src = urls.get(entry.path);
    try { await img.decode(); } catch { urls.dispose(); throw new Error('图片解码失败'); }
    element.append(img);
    let pulse;
    return {
      motions: [], expressions: [],
      event(event) { if (event.kind === 'completed' && img.animate) { pulse?.cancel(); pulse = img.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-8px)' }, { transform: 'translateY(0)' }], 420); } },
      dispose() { pulse?.cancel(); img.remove(); urls.dispose(); },
    };
  },
};
