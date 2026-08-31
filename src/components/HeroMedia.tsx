import { useEffect, useRef, useState } from 'react';
import { attachHeroPlayback } from './heroPlayback';
import { assetUrl } from '../media';

export default function HeroMedia() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [compact] = useState(() => window.matchMedia('(max-width: 1024px)').matches);
  const poster = assetUrl('/portfolio-assets/00-hero/hero-poster.jpg');
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
        poster={poster}
      >
        <source src={assetUrl('/portfolio-assets/00-hero/hero-background.webm', compact)} type="video/webm" />
        <source src={assetUrl('/portfolio-assets/00-hero/hero-background.mp4', compact)} type="video/mp4" />
      </video>
      <div className={ready ? 'hero-image is-hidden' : 'hero-image'} style={{ backgroundImage: `url("${poster}")` }} />
      <div className="hero-scan" />
    </div>
  );
}
