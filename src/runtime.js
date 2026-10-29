export class PetRuntime {
  adapters = new Map(); active = null; generation = 0; disposed = false;
  register(adapter) {
    if (this.adapters.has(adapter.id)) throw new Error(`运行适配器已存在：${adapter.id}`);
    this.adapters.set(adapter.id, adapter);
    return () => { if (this.active?.adapter === adapter.id) this.clear(); this.adapters.delete(adapter.id); };
  }
  async select(pack, entry, host) {
    if (this.disposed) throw new Error('桌宠运行器已关闭');
    const adapter = this.adapters.get(entry.adapter);
    if (!adapter) throw new Error(`没有对应运行适配器：${entry.adapter}`);
    const generation = ++this.generation, element = document.createElement('div');
    element.className = 'dph-runtime'; element.style.visibility = 'hidden'; host.append(element);
    let candidate;
    try {
      candidate = await adapter.mount({ pack, entry, element });
      if (this.disposed || generation !== this.generation) { candidate.dispose(); element.remove(); return null; }
      const old = this.active;
      this.active = { instance: candidate, element, adapter: entry.adapter };
      element.style.visibility = '';
      old?.instance.dispose(); old?.element.remove();
      return candidate;
    } catch (e) {
      candidate?.dispose(); element.remove();
      if (this.disposed || generation !== this.generation) return null;
      throw e;
    }
  }
  send(event) { return this.active?.instance.event?.(event); }
  visible(value) { this.active?.instance.visible?.(value); }
  clear() { ++this.generation; this.active?.instance.dispose(); this.active?.element.remove(); this.active = null; }
  dispose() { this.disposed = true; this.clear(); }
}
export function normalizeNotification(detail) {
  if (!detail || detail.version !== 1 || typeof detail.text !== 'string') return null;
  const kinds = ['info', 'completed', 'question', 'approval', 'balance'];
  return { kind: kinds.includes(detail.kind) ? detail.kind : 'info', text: detail.text.slice(0, 400), duration: Math.max(1000, Math.min(30000, Number(detail.duration) || 6000)) };
}
