import { useEffect, useRef, useState } from 'react';
import { IMAGE_SIZES, motionAsset } from '../media';
import OptimizedImage from './OptimizedImage';
import { attachScenePlayback } from './scenePlayback';

export default function MotionArtwork({ src, alt }: { src: string; alt: string }) {
  const motion = motionAsset(src);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playbackRef = useRef<ReturnType<typeof attachScenePlayback>>();
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!videoRef.current || failed) return;
    const playback = attachScenePlayback(videoRef.current, setBlocked);
    playbackRef.current = playback;
    return () => { playback.dispose(); playbackRef.current = undefined; };
  }, [motion?.url, failed]);

  // Preserve transparent/variable-timing artwork as animation, and fall back on decode errors.
  if (!motion || failed) return <OptimizedImage src={src} sizes={IMAGE_SIZES.spin} alt={alt} />;
  return <>
    <video ref={videoRef} src={motion.url} poster={motion.poster} muted playsInline loop preload="none" aria-label={alt} onError={() => setFailed(true)} />
    {blocked && <button type="button" className="motion-play" aria-label={`播放${alt}`} onClick={() => playbackRef.current?.play()}>▶</button>}
  </>;
}
