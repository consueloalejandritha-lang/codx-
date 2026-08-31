export const SOFTWARE_SPEED = 24; // CSS pixels per second, independent of refresh rate.
export const softwareOverflows = (contentWidth: number, viewportWidth: number) => contentWidth > viewportWidth + 1;
export const nextSoftwareOffset = (offset: number, seconds: number, distance: number) =>
  distance > 0 ? (offset + Math.max(0, Math.min(seconds, 0.05)) * SOFTWARE_SPEED) % distance : 0;

/** Native horizontal scrolling remains available; the duplicate list makes wrapping seamless. */
export function attachSoftwareLoop(viewport: HTMLDivElement, list: HTMLUListElement, onOverflow: (value: boolean) => void) {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let overflow = false;
  let visible = false;
  let hovered = false;
  let keyboardFocused = false;
  let dragging = false;
  let disposed = false;
  let distance = 0;
  let frame = 0;
  let previousTime = 0;
  let offset = 0;
  let resumeTimer = 0;
  const canRun = () => overflow && visible && !document.hidden && !motion.matches && !hovered && !keyboardFocused && !dragging && !resumeTimer && !disposed;
  const stop = () => { cancelAnimationFrame(frame); frame = 0; previousTime = 0; };
  const tick = (time: number) => {
    frame = 0;
    if (!canRun()) { previousTime = 0; return; }
    const seconds = previousTime ? (time - previousTime) / 1000 : 0;
    if (!previousTime) offset = viewport.scrollLeft;
    previousTime = time;
    offset = nextSoftwareOffset(offset, seconds, distance);
    viewport.scrollLeft = offset;
    frame = requestAnimationFrame(tick);
  };
  const sync = () => { if (canRun()) { if (!frame) frame = requestAnimationFrame(tick); } else stop(); };
  const measure = () => {
    const width = list.getBoundingClientRect().width;
    distance = width + (parseFloat(getComputedStyle(list.parentElement!).columnGap) || 0);
    overflow = softwareOverflows(width, viewport.clientWidth);
    onOverflow(overflow);
    if (!overflow) viewport.scrollLeft = 0;
    else if (viewport.scrollLeft >= distance) viewport.scrollLeft %= distance;
    sync();
  };
  const pauseForInteraction = () => {
    stop();
    window.clearTimeout(resumeTimer);
    resumeTimer = window.setTimeout(() => { resumeTimer = 0; sync(); }, 3000);
  };
  const enter = (event: PointerEvent) => { if (event.pointerType !== 'touch') { hovered = true; sync(); } };
  const leave = () => { hovered = false; sync(); };
  const down = () => { dragging = true; pauseForInteraction(); };
  const up = () => { if (dragging) { dragging = false; pauseForInteraction(); } };
  const focus = () => { keyboardFocused = viewport.matches(':focus-visible'); sync(); };
  const blur = () => { keyboardFocused = false; sync(); };
  const resize = new ResizeObserver(measure);
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
  resize.observe(viewport);
  resize.observe(list);
  observer.observe(viewport);
  viewport.addEventListener('pointerenter', enter);
  viewport.addEventListener('pointerleave', leave);
  viewport.addEventListener('pointerdown', down, { passive: true });
  window.addEventListener('pointerup', up, { passive: true });
  window.addEventListener('pointercancel', up, { passive: true });
  viewport.addEventListener('wheel', pauseForInteraction, { passive: true });
  viewport.addEventListener('keydown', pauseForInteraction);
  viewport.addEventListener('focus', focus);
  viewport.addEventListener('blur', blur);
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', sync);
  measure();
  return () => {
    disposed = true;
    stop();
    window.clearTimeout(resumeTimer);
    resize.disconnect();
    observer.disconnect();
    viewport.removeEventListener('pointerenter', enter);
    viewport.removeEventListener('pointerleave', leave);
    viewport.removeEventListener('pointerdown', down);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    viewport.removeEventListener('wheel', pauseForInteraction);
    viewport.removeEventListener('keydown', pauseForInteraction);
    viewport.removeEventListener('focus', focus);
    viewport.removeEventListener('blur', blur);
    document.removeEventListener('visibilitychange', sync);
    motion.removeEventListener('change', sync);
  };
}
