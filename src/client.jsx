import { PetPanel } from './PetPanel.jsx';
import css from './style.css';
export const name = 'pet-hub-client';
export const inject = ['slots'];
export function apply(ctx) {
  ctx.effect(() => {
    const style = document.createElement('style'); style.dataset.plugin = 'dsh-pet-hub'; style.textContent = css; document.head.append(style);
    return () => style.remove();
  });
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({ name: 'sidebar.footer.action', id: 'pet-hub', order: -1000 }, PetPanel));
}
