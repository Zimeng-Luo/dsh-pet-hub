// SlotOutlet adds a display:contents wrapper. Work on the actual flex list,
// keep existing sibling order/width/style, and remove our class on detach.
export function attachFooterLayout(root) {
  let parent = root?.parentElement;
  while (parent && getComputedStyle(parent).display === 'contents') parent = parent.parentElement;
  if (!parent) return () => {};
  const owned = !parent.classList.contains('dph-footer-host');
  parent.classList.add('dph-footer-host');
  const foot = parent.parentElement, shell = foot?.parentElement;
  const flexible = shell ? [...shell.children].filter(el => el !== foot && Number(getComputedStyle(el).flexGrow) > 0) : [];
  const measure = () => {
    const own = root.getBoundingClientRect().height;
    const peers = Math.max(0, parent.getBoundingClientRect().height - own);
    const below = Math.max(0, (foot?.getBoundingClientRect().height || 0) - parent.getBoundingClientRect().height);
    let available = innerHeight - 220 - peers - below;
    if (shell && getComputedStyle(shell).flexDirection === 'column' && flexible.length) {
      const style = getComputedStyle(shell);
      const fixed = [...shell.children].filter(el => el !== foot && !flexible.includes(el)).reduce((height, el) => {
        const css = getComputedStyle(el);
        return height + el.getBoundingClientRect().height + (parseFloat(css.marginTop) || 0) + (parseFloat(css.marginBottom) || 0);
      }, 0);
      // Keep 96px available for the session browsing region. Its own overflow
      // rules own scrolling; the pet never positions itself over that region.
      available = shell.clientHeight - (parseFloat(style.paddingTop) || 0) - (parseFloat(style.paddingBottom) || 0) - fixed - 96 - peers - below;
    }
    const value = `${Math.max(0, Math.floor(available))}px`;
    if (root.style.getPropertyValue('--dph-available-height') !== value) root.style.setProperty('--dph-available-height', value);
  };
  const observer = new ResizeObserver(measure);
  observer.observe(parent); observer.observe(root);
  if (parent.parentElement) observer.observe(parent.parentElement);
  if (shell) observer.observe(shell);
  flexible.forEach(el => observer.observe(el));
  measure();
  return () => { observer.disconnect(); if (owned) parent.classList.remove('dph-footer-host'); root.style.removeProperty('--dph-available-height'); };
}
