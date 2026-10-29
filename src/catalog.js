import JSON5 from 'json5';
import { detectMver, orderMverEntries } from './adapters/mver.js';

export const LIMITS = Object.freeze({ archive: 256 * 1024 ** 2, expanded: 512 * 1024 ** 2, file: 128 * 1024 ** 2, entries: 6000 });
export function safePath(raw) {
  if (typeof raw !== 'string' || !raw || /[\x00-\x1f]/.test(raw)) throw new Error('资源路径为空或含控制字符');
  const path = raw.replaceAll('\\', '/');
  if (/^(?:\/|[a-z][a-z0-9+.-]*:)/i.test(path) || /[?#]/.test(path)) throw new Error(`不允许的资源路径：${raw}`);
  const parts = path.split('/').filter(x => x && x !== '.');
  if (parts.includes('..')) throw new Error(`资源路径不能越出目录：${raw}`);
  if (!parts.length) throw new Error('资源路径为空');
  return parts.join('/');
}
export function resolveReference(entry, reference) {
  if (typeof reference !== 'string') throw new Error('模型文件引用必须是字符串');
  const ref = reference.replaceAll('\\', '/');
  if (/^(?:\/|[a-z][a-z0-9+.-]*:)/i.test(ref) || /[\x00-\x1f?#]/.test(ref)) throw new Error(`不允许的模型引用：${reference}`);
  const stack = entry.split('/').slice(0, -1);
  for (const p of ref.split('/')) {
    if (!p || p === '.') continue;
    if (p === '..') { if (!stack.length) throw new Error('模型引用越出资源包'); stack.pop(); }
    else stack.push(p);
  }
  return safePath(stack.join('/'));
}
export function parseModel(text) {
  const model = JSON5.parse(text);
  if (!model || typeof model !== 'object' || Array.isArray(model) || !model.FileReferences?.Moc) throw new Error('缺少 FileReferences.Moc，不能作为 Cubism 3/4/5 模型加载');
  return model;
}
export function references(model) {
  const r = model.FileReferences;
  const paths = [r.Moc, r.Physics, r.Pose, r.DisplayInfo, r.UserData, ...(r.Textures ?? [])];
  for (const e of r.Expressions ?? []) paths.push(e.File);
  for (const group of Object.values(r.Motions ?? {})) for (const m of group) paths.push(m.File, m.Sound);
  return paths.filter(x => x !== undefined && x !== '');
}
export async function inspectPack(files, name = '未命名资源') {
  if (!Array.isArray(files) || files.length > LIMITS.entries) throw new Error('资源文件数量超过限制');
  const normalized = [], seen = new Set();
  let total = 0;
  for (const file of files) {
    const path = safePath(file.path), key = path.toLowerCase();
    if (seen.has(key)) throw new Error(`存在重复或大小写冲突的文件：${path}`);
    seen.add(key);
    if (!(file.blob instanceof Blob)) throw new Error('资源内容不是 Blob');
    if (file.blob.size > LIMITS.file || (total += file.blob.size) > LIMITS.expanded) throw new Error('资源大小超过限制');
    normalized.push({ path, blob: file.blob });
  }
  const byPath = new Map(normalized.map(f => [f.path, f]));
  const entries = [];
  for (const file of normalized.filter(f => /\.model3\.json$/i.test(f.path))) {
    const model = parseModel(await file.blob.text());
    const missing = references(model).map(r => resolveReference(file.path, r)).filter(p => !byPath.has(p));
    if (missing.length) throw new Error(`模型 ${file.path} 缺少文件：${missing.slice(0, 5).join('、')}`);
    const mver = await detectMver(byPath, file.path);
    entries.push({ path: file.path, label: mver?.label || file.path.split('/').at(-1).replace(/\.model3\.json$/i, ''), adapter: 'bongocat-live2d', ...(mver ? { mver } : {}) });
  }
  // Explicit fallback: never guess a model texture is the pet itself.
  if (!entries.length) for (const file of normalized.filter(f => /\.(png|webp|gif|jpe?g)$/i.test(f.path))) {
    entries.push({ path: file.path, label: file.path.split('/').at(-1), adapter: 'image' });
  }
  if (!entries.length) throw new Error('未找到 .model3.json 或图片。请导入包含模型资源的文件夹，而不是单独的可执行程序。');
  return { id: crypto.randomUUID(), name, files: normalized, entries: orderMverEntries(entries), createdAt: Date.now(), catalogVersion: 2 };
}
export function mime(path) {
  const ext = path.split('.').at(-1).toLowerCase();
  return ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', json: 'application/json', wav: 'audio/wav', mp3: 'audio/mpeg', ogg: 'audio/ogg' })[ext] ?? 'application/octet-stream';
}
export function assetURLs(pack) {
  const urls = new Map(pack.files.map(f => [f.path, URL.createObjectURL(new Blob([f.blob], { type: mime(f.path) }))]));
  let disposed = false;
  return {
    get(path) { const url = urls.get(path); if (!url) throw new Error(`缺少资源：${path}`); return url; },
    dispose() { if (disposed) return; disposed = true; for (const url of urls.values()) URL.revokeObjectURL(url); },
  };
}
