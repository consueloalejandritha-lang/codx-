type PlaybackState = { ready: boolean; transitioning: boolean };

/** Visibility-aware muted playback. A decoded frame, not metadata, reveals the video. */
export function attachHeroPlayback(video: HTMLVideoElement, onState: (state: PlaybackState) => void) {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let disposed = false;
  let pending = false;
  let loopTimer = 0;
  let state: PlaybackState = { ready: false, transitioning: false };
  const active = () => visible && !document.hidden && !motion.matches && !disposed;
  const update = (patch: Partial<PlaybackState>) => {
    if (!disposed) { state = { ...state, ...patch }; onState(state); }
  };
  const cancelLoop = () => { window.clearTimeout(loopTimer); loopTimer = 0; };
  const play = () => {
    if (!active() || pending || loopTimer || !video.paused) return;
    if (video.ended) video.currentTime = 0;
    pending = true;
    void video.play().then(() => {
      if (!active()) video.pause();
    }).catch(() => {
      // Low-power mode / autoplay restrictions must never hide the fallback image.
      update({ ready: false, transitioning: false });
    }).finally(() => { pending = false; });
  };
  const sync = () => {
    if (active()) play();
    else {
      cancelLoop();
      video.pause();
      update({ transitioning: false, ...(motion.matches ? { ready: false } : {}) });
    }
  };
  const onPlaying = () => {
    if (!active()) { video.pause(); return; }
    update({ ready: true, transitioning: false });
  };
  const onPause = () => {
    if (active() && !video.ended && !loopTimer) update({ ready: false });
  };
  const onError = () => { cancelLoop(); update({ ready: false, transitioning: false }); };
  const onEnded = () => {
    if (!active() || loopTimer) return;
    update({ transitioning: true });
    loopTimer = window.setTimeout(() => {
      loopTimer = 0;
      if (!active()) return;
      video.currentTime = 0;
      play();
    }, 700);
  };
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  });
  video.muted = true;
  observer.observe(video);
  video.addEventListener('playing', onPlaying);
  video.addEventListener('pause', onPause);
  video.addEventListener('ended', onEnded);
  video.addEventListener('error', onError);
  video.addEventListener('canplay', play);
  document.addEventListener('visibilitychange', sync);
  document.addEventListener('pointerdown', play, { passive: true });
  motion.addEventListener('change', sync);
  return () => {
    disposed = true;
    cancelLoop();
    observer.disconnect();
    video.removeEventListener('playing', onPlaying);
    video.removeEventListener('pause', onPause);
    video.removeEventListener('ended', onEnded);
    video.removeEventListener('error', onError);
    video.removeEventListener('canplay', play);
    document.removeEventListener('visibilitychange', sync);
    document.removeEventListener('pointerdown', play);
    motion.removeEventListener('change', sync);
    video.pause();
  };
}
