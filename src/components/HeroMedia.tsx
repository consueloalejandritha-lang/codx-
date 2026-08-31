import { useEffect, useRef, useState } from 'react';
import { attachHeroPlayback } from './heroPlayback';

export default function HeroMedia() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [{ ready, transitioning }, setPlayback] = useState({ ready: false, transitioning: false });
  useEffect(() => {
    if (videoRef.current) return attachHeroPlayback(videoRef.current, setPlayback);
  }, []);

  return (
    <div className="hero-media" aria-hidden="true">
      <video
        ref={videoRef}
        className={`hero-video${ready ? ' is-ready' : ''}${transitioning ? ' is-transitioning' : ''}`}
        muted
        playsInline
        preload="metadata"
        poster="/portfolio-assets/00-hero/hero-poster.jpg"
      >
        <source src="/portfolio-assets/00-hero/hero-background.webm" type="video/webm" />
        <source src="/portfolio-assets/00-hero/hero-background.mp4" type="video/mp4" />
      </video>
      <div className={ready ? 'hero-image is-hidden' : 'hero-image'} />
      <div className="hero-scan" />
    </div>
  );
}
