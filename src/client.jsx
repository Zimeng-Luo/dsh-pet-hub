import { PetPanel } from './PetPanel.jsx';
import { SettingsPage } from './SettingsPage.jsx';
import { createPetBridge } from './pet-bridge.js';
import css from './style.css';
export const name = 'pet-hub-client';
export const inject = ['slots'];
export function apply(ctx) {
  const bridge = createPetBridge();
  ctx.effect(() => {
    const style = document.createElement('style'); style.dataset.plugin = 'dsh-pet-hub'; style.textContent = css; document.head.append(style);
    return () => style.remove();
  });
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({ name: 'sidebar.footer.action', id: 'pet-hub', order: -1000, inject: () => ({ publishPet: bridge.publish, clearPet: bridge.clear }) }, PetPanel));
  ctx.slots.inject('settings.section', () => ctx.slots.register({ name: 'settings.section', id: 'pet-hub', order: 90, label: '桌宠', inject: () => ({ hooks: { pet: bridge } }) }, SettingsPage));
}
