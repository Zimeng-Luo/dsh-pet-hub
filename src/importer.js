import { unzip } from 'fflate';
import { inspectPack, safePath, LIMITS } from './catalog.js';

// Validate the ZIP directory before allocating decompression buffers.
export function preflightZip(bytes) {
  if (bytes.byteLength > LIMITS.archive) throw new Error('ZIP 超过 256 MiB，请改用文件夹导入');
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (v.getUint32(i, true) === 0x06054b50 && i + 22 + v.getUint16(i + 20, true) === bytes.length) { end = i; break; }
  }
  if (end < 0) throw new Error('ZIP 目录损坏，或是分卷压缩包');
  const count = v.getUint16(end + 10, true), start = v.getUint32(end + 16, true), directorySize = v.getUint32(end + 12, true);
  if (v.getUint16(end + 4, true) || v.getUint16(end + 6, true) || count !== v.getUint16(end + 8, true)) throw new Error('不支持分卷 ZIP');
  if (count === 65535 || start === 0xffffffff || directorySize === 0xffffffff) throw new Error('不支持 ZIP64，请解压后导入文件夹');
  if (count > LIMITS.entries || start + directorySize !== end) throw new Error('ZIP 目录异常或文件过多');
  let offset = start, total = 0;
  const names = new Set(), decoder = new TextDecoder('utf-8', { fatal: true });
  for (let i = 0; i < count; i++) {
    if (offset + 46 > end || v.getUint32(offset, true) !== 0x02014b50) throw new Error('ZIP 目录损坏');
    const flags = v.getUint16(offset + 8, true), method = v.getUint16(offset + 10, true);
    const size = v.getUint32(offset + 24, true), compressed = v.getUint32(offset + 20, true);
    const n = v.getUint16(offset + 28, true), extra = v.getUint16(offset + 30, true), comment = v.getUint16(offset + 32, true);
    if (offset + 46 + n + extra + comment > end) throw new Error('ZIP 文件名越界');
    if (flags & 1 || ![0, 8].includes(method)) throw new Error('不支持加密 ZIP 或这种压缩方法');
    if (size > LIMITS.file || (total += size) > LIMITS.expanded || compressed === 0xffffffff) throw new Error('ZIP 解压体积超过限制');
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + n)), path = safePath(name);
    if (names.has(path.toLowerCase())) throw new Error(`ZIP 中有重复路径：${path}`);
    names.add(path.toLowerCase());
    const mode = v.getUint32(offset + 38, true) >>> 16;
    if ((mode & 0xf000) === 0xa000) throw new Error('ZIP 不能包含符号链接');
    offset += 46 + n + extra + comment;
  }
  if (offset !== end) throw new Error('ZIP 目录长度不匹配');
  return { count, total };
}
export async function importZip(file) {
  if (file.size > LIMITS.archive) throw new Error('ZIP 超过 256 MiB，请解压后选择文件夹');
  const bytes = new Uint8Array(await file.arrayBuffer());
  preflightZip(bytes);
  const result = await new Promise((resolve, reject) => unzip(bytes, (error, data) => error ? reject(error) : resolve(data)));
  return inspectPack(Object.entries(result).filter(([p]) => !p.endsWith('/')).map(([path, data]) => ({ path, blob: new Blob([data]) })), file.name.replace(/\.zip$/i, ''));
}
export async function importDirectory(list) {
  const files = Array.from(list);
  return inspectPack(files.map(file => ({ path: file.webkitRelativePath || file.name, blob: file })), (files[0]?.webkitRelativePath || '文件夹').split('/')[0]);
}
