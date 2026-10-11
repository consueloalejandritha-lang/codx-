import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import type { ModelController, ModelStatus } from './modelViewer';
import { clampUnit } from './modelMotion';
import { createModelTouch } from './modelTouch';
import { assetUrl, IMAGE_SIZES } from '../media';
import OptimizedImage from './OptimizedImage';

type Props = { src: string; poster: string; title: string; appearance?: 'default' | 'helmet' };

export default function InteractiveModel({ src, poster, title, appearance = 'default' }: Props) {
  const regionRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<ModelController>();
  const touchRef = useRef(createModelTouch());
  const keyboardRef = useRef({ x: 0, y: 0 });
  const [status, setStatus] = useState<ModelStatus>('loading');

  useEffect(() => {
    const region = regionRef.current;
    const stage = stageRef.current;
    if (!region || !stage) return;
    let cancelled = false;
    let started = false;
    let inView = false;
    setStatus('loading');
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      controllerRef.current?.setVisible(inView);
      if (!inView || started) return;
      started = true;
      void import('./modelViewer').then(({ createModelViewer }) => {
        if (cancelled) return;
        const compact = window.matchMedia('(max-width: 1024px)').matches;
        controllerRef.current = createModelViewer(stage, assetUrl(src, compact), (next) => {
          if (!cancelled) setStatus(next);
        }, appearance);
        controllerRef.current.setVisible(inView);
      }).catch(() => { if (!cancelled) setStatus('error'); });
    }, { rootMargin: '160px' });
    observer.observe(region);
    return () => {
      cancelled = true;
      observer.disconnect();
      controllerRef.current?.dispose();
      controllerRef.current = undefined;
    };
  }, [src, appearance]);

  const reset = () => {
    touchRef.current.reset();
    keyboardRef.current = { x: 0, y: 0 };
    controllerRef.current?.reset();
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    if ((event.pointerType === 'mouse' || event.pointerType === 'pen') && !touchRef.current.active()) {
      controllerRef.current?.setPointer((event.clientX - rect.left) / rect.width * 2 - 1, (event.clientY - rect.top) / rect.height * 2 - 1);
    } else if (event.pointerType === 'touch') {
      const target = touchRef.current.move(event.pointerId, event.clientX, event.clientY, rect.width, rect.height);
      if (target) { event.preventDefault(); controllerRef.current?.setPointer(target.x, target.y); }
    }
  };
  const handleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' || event.key === 'Home') { event.preventDefault(); reset(); return; }
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const target = keyboardRef.current;
    if (event.key === 'ArrowLeft') target.x -= 0.25;
    if (event.key === 'ArrowRight') target.x += 0.25;
    if (event.key === 'ArrowUp') target.y -= 0.25;
    if (event.key === 'ArrowDown') target.y += 0.25;
    target.x = clampUnit(target.x);
    target.y = clampUnit(target.y);
    controllerRef.current?.setPointer(target.x, target.y);
  };

  return (
    <div
      ref={regionRef}
      className={`interactive-model is-${status}`}
      role="group"
      aria-label={`${title} 3D 模型；鼠标移动或触屏拖动可转动，离开或松手后回正。键盘方向键旋转，Escape 回正。`}
      tabIndex={0}
      onPointerMove={move}
      onPointerDown={(event) => {
        if (event.pointerType !== 'touch' || status !== 'ready') return;
        if (!touchRef.current.begin(event.pointerId, event.clientX, event.clientY, event.isPrimary)) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerUp={(event) => {
        if (!touchRef.current.end(event.pointerId)) return;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        reset();
      }}
      onPointerCancel={(event) => { if (touchRef.current.end(event.pointerId)) reset(); }}
      onLostPointerCapture={(event) => { if (touchRef.current.end(event.pointerId)) reset(); }}
      onPointerLeave={(event) => { if (event.pointerType !== 'touch' && !touchRef.current.active()) reset(); }}
      onKeyDown={handleKey}
      onBlur={reset}
    >
      <OptimizedImage className="model-poster" src={poster} sizes={IMAGE_SIZES.full} alt={`${title}静态预览`} loading="lazy" decoding="async" draggable={false} />
      <div ref={stageRef} className="model-stage" />
      <span className="model-badge" aria-hidden="true">3D / INTERACTIVE</span>
      <p className="model-status" role="status">
        {status === 'loading' && '正在加载 3D 模型…'}
        {status === 'error' && '3D 暂不可用 · 当前显示作品图片'}
        {status === 'ready' && <><span className="model-mouse-hint">移动鼠标探索 · 移开回正</span><span className="model-touch-hint">拖动模型探索 · 松手回正</span></>}
      </p>
    </div>
  );
}
