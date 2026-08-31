/** Play scene previews only on screen; a blocked autoplay still has a manual start. */
export function attachScenePlayback(video: HTMLVideoElement, blocked: (value: boolean) => void) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let manual = false;
  let disposed = false;
  let request = 0;
  const allowed = () => visible && !document.hidden && (!reduced.matches || manual);
  const sync = () => {
    const current = ++request;
    if (!allowed()) {
      video.pause();
      blocked(reduced.matches && !manual);
      return;
    }
    void video.play().then(() => {
      if (disposed || !allowed()) video.pause();
      else if (current === request) blocked(false);
    }).catch(() => { if (!disposed && current === request) blocked(true); });
  };
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: 0.05 });
  observer.observe(video);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  blocked(reduced.matches);
  return {
    play() { manual = true; sync(); },
    dispose() {
      disposed = true;
      request++;
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      reduced.removeEventListener('change', sync);
      video.pause();
    },
  };
}
