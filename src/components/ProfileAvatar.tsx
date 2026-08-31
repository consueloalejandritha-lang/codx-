import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { AVATAR_ENTRANCE_MS, AVATAR_GREETING_MS, AVATAR_POSES, AVATAR_VISIBILITY_THRESHOLD, avatarVisit } from './avatarMotion';
import type { AvatarPhase } from './avatarMotion';
import './ProfileAvatar.css';

const AVATAR = '/portfolio-assets/09-profile/avatar-original.png';
const POSES = '/portfolio-assets/09-profile/avatar-poses-v2.png';

// Display-only crops: preserve the source PNG and align the feet to y=570.
// The first row is taller than half the atlas; an equal grid would cut its boots.
const poseRegistration = [
  { x: 0, y: 0, w: 313.5, h: 645, scale: .94, dx: 15, dy: -27 },
  { x: 313.5, y: 0, w: 313.5, h: 645, scale: 1, dx: 1, dy: -23 },
  { x: 627, y: 0, w: 313.5, h: 645, scale: 1, dx: 26, dy: -29 },
  { x: 940.5, y: 0, w: 313.5, h: 645, scale: 1, dx: 40, dy: -29 },
  { x: 0, y: 645, w: 313.5, h: 609, scale: 1, dx: 10, dy: 26 },
  { x: 313.5, y: 645, w: 313.5, h: 609, scale: 1, dx: 8, dy: 25 },
  { x: 627, y: 645, w: 313.5, h: 609, scale: 1, dx: 29, dy: 25 },
  { x: 940.5, y: 645, w: 313.5, h: 609, scale: 1, dx: 46, dy: 24 },
];
function PoseFrame({ frame }: { frame: number }) {
  const p = poseRegistration[frame];
  return <svg className="avatar-pose-sheet" viewBox="0 0 330 600" aria-hidden="true">
    <svg x={p.dx} y={p.dy} width={p.w * p.scale} height={p.h * p.scale} viewBox={`${p.x} ${p.y} ${p.w} ${p.h}`} overflow="hidden">
      <image href={POSES} width="1254" height="1254" />
    </svg>
  </svg>;
}

export default function ProfileAvatar({ name }: { name: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const inViewRef = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [assets, setAssets] = useState({ settled: false, poses: false });
  const [phase, setPhase] = useState<AvatarPhase>(() => avatarVisit.hasEntered() ? 'idle' : 'waiting');
  const [pose, setPose] = useState(0);

  // Only preload the entrance art. There is no cursor/gaze asset or listener.
  useEffect(() => {
    if (!loaded) return;
    let disposed = false;
    let done = false;
    const image = new Image();
    const finish = (poses: boolean) => {
      if (disposed || done) return;
      done = true;
      window.clearTimeout(timer);
      image.onload = image.onerror = null;
      setAssets({ settled: true, poses });
    };
    const timer = window.setTimeout(() => finish(false), 10000);
    image.onload = () => { void image.decode().then(() => finish(true), () => finish(false)); };
    image.onerror = () => finish(false);
    image.src = POSES;
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      image.onload = image.onerror = null;
    };
  }, [loaded]);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timers: number[] = [];
    const clearTimers = () => {
      timers.forEach(window.clearTimeout);
      timers = [];
    };
    const settle = () => {
      clearTimers();
      setPose(0);
      if (avatarVisit.hasEntered()) setPhase('idle');
    };
    const enter = () => {
      if (timers.length) return;
      const next = avatarVisit.enter({
        visible: inViewRef.current,
        ready: loaded && assets.settled,
        pageVisible: !document.hidden,
        reducedMotion: motion.matches || imageFailed || !assets.poses,
      });
      setPhase(next);
      if (next !== 'entering') return;
      setPose(AVATAR_POSES[0].frame);
      for (const key of AVATAR_POSES.slice(1)) {
        timers.push(window.setTimeout(() => setPose(key.frame), key.at));
      }
      timers.push(window.setTimeout(() => setPhase('greeting'), AVATAR_ENTRANCE_MS));
      timers.push(window.setTimeout(settle, AVATAR_ENTRANCE_MS + AVATAR_GREETING_MS));
    };
    const observer = new IntersectionObserver(([entry]) => {
      inViewRef.current = entry.isIntersecting && entry.intersectionRatio >= AVATAR_VISIBILITY_THRESHOLD;
      if (inViewRef.current) enter();
      // Don't interrupt a playing greeting just because visibility dips below 45%.
      else if (!entry.isIntersecting) settle();
    }, { threshold: [0, AVATAR_VISIBILITY_THRESHOLD] });
    // Recheck visibility when assets finish loading, without consuming a visit on home.
    inViewRef.current = false;
    observer.observe(card);
    const changeMotion = () => {
      if (motion.matches) settle();
    };
    const changeVisibility = () => {
      if (document.hidden) settle();
      else enter();
    };
    document.addEventListener('visibilitychange', changeVisibility);
    motion.addEventListener('change', changeMotion);
    return () => {
      clearTimers();
      observer.disconnect();
      document.removeEventListener('visibilitychange', changeVisibility);
      motion.removeEventListener('change', changeMotion);
    };
  }, [loaded, imageFailed, assets]);

  return (
    <div ref={cardRef}
      className={`portrait-card avatar-card avatar-${phase}${imageFailed ? ' avatar-image-failed' : ''}`}
      style={{ '--entrance-duration': `${AVATAR_ENTRANCE_MS}ms` } as CSSProperties}>
      <p className="avatar-eyebrow">MY DIGITAL SELF <i aria-hidden="true" /></p>
      <p className="avatar-bubble" aria-hidden="true">嗨，我是{name}。</p>
      <div className="avatar-stage">
        <div className="avatar-arrival">
          <div className="avatar-figure">
            {assets.poses && <PoseFrame frame={pose} />}
            <div className="avatar-rest">
              <img className="avatar-sprite" src={AVATAR}
                alt={`${name}的3D形象：黑发、黑框眼镜，穿着针织衫与棕色短靴`}
                width={931} height={1690} loading="lazy" decoding="async" draggable={false}
                onLoad={() => setLoaded(true)} onError={() => { setImageFailed(true); setLoaded(true); }} />
            </div>
          </div>
        </div>
      </div>
      {imageFailed && <p className="avatar-unavailable" role="status">形象图片暂时无法加载，请刷新重试。</p>}
      <div className="avatar-footer"><p>CHARACTER / PERSONAL WORK</p></div>
    </div>
  );
}
