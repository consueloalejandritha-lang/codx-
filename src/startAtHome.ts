/** Run once before React mounts, not on chapter navigation or component rerenders. */
export function startAtHome(page: Window = window) {
  page.history.scrollRestoration = 'manual';
  page.history.replaceState(page.history.state, '', `${page.location.pathname}${page.location.search}#home`);
  const reset = () => page.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  reset();

  // Browser restoration can finish at pageshow. Don't pull the visitor back if
  // they have already scrolled, tapped a chapter, or started keyboard navigation.
  const inputEvents = ['wheel', 'touchstart', 'pointerdown', 'keydown', 'hashchange'] as const;
  const cleanup = () => {
    inputEvents.forEach(type => page.removeEventListener(type, cleanup));
    page.removeEventListener('pageshow', shown);
  };
  const shown = (event: PageTransitionEvent) => {
    if (!event.persisted && page.location.hash === '#home') reset();
    cleanup();
  };
  inputEvents.forEach(type => page.addEventListener(type, cleanup, { passive: true }));
  page.addEventListener('pageshow', shown, { once: true });
  return cleanup;
}
