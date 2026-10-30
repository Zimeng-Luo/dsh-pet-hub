// One controller snapshot for both the persistent pet and its settings page.
// Closing Settings does not stop or recreate the pet runtime.
const empty = Object.freeze({ ready: false });
export function createPetBridge() {
  let snapshot = empty;
  const listeners = new Set();
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    publish(next) { snapshot = next; for (const listener of listeners) listener(); },
    clear() { snapshot = empty; for (const listener of listeners) listener(); },
  };
}
