import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { approachAngle, pointerRotation } from './modelMotion';
import { prepareModel } from './modelScene';

export type ModelStatus = 'loading' | 'ready' | 'error';
export type ModelController = {
  setPointer(x: number, y: number): void;
  reset(): void;
  setVisible(visible: boolean): void;
  dispose(): void;
};

function disposeObject(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  const bitmaps = new Set<ImageBitmap>();
  for (const texture of textures) {
    if (typeof ImageBitmap !== 'undefined' && texture.source.data instanceof ImageBitmap) bitmaps.add(texture.source.data);
    texture.dispose();
  }
  bitmaps.forEach((bitmap) => bitmap.close());
  materials.forEach((material) => material.dispose());
  geometries.forEach((geometry) => geometry.dispose());
}

export function createModelViewer(host: HTMLDivElement, src: string, onStatus: (status: ModelStatus) => void): ModelController {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.05, 100);
  // Double the on-screen model size without changing the archive card or lighting.
  camera.zoom = 2;
  const baseRotation = new THREE.Euler(-0.04, -0.25, -0.035);
  const request = new AbortController();
  const draco = new DRACOLoader();
  draco.setDecoderPath(`${import.meta.env.BASE_URL}vendor/draco/`);
  draco.setWorkerLimit(1);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let model: THREE.Group | undefined;
  let environment: THREE.WebGLRenderTarget | undefined;
  let disposed = false;
  let visible = true;
  let failed = false;
  let frame = 0;
  let previousTime = 0;
  let pitch = 0;
  let yaw = 0;
  let targetPitch = 0;
  let targetYaw = 0;

  const renderFrame = (time: number) => {
    frame = 0;
    if (disposed || failed || !visible || !model || document.hidden) return;
    const seconds = previousTime ? (time - previousTime) / 1000 : 1 / 60;
    previousTime = time;
    pitch = reducedMotion.matches ? targetPitch : approachAngle(pitch, targetPitch, seconds);
    yaw = reducedMotion.matches ? targetYaw : approachAngle(yaw, targetYaw, seconds);
    model.rotation.set(baseRotation.x + pitch, baseRotation.y + yaw, baseRotation.z);
    renderer.render(scene, camera);
    if (pitch !== targetPitch || yaw !== targetYaw) schedule();
  };
  const schedule = () => {
    if (!frame && visible && !document.hidden && !disposed && !failed) frame = requestAnimationFrame(renderFrame);
  };
  const reset = () => {
    targetPitch = 0;
    targetYaw = 0;
    schedule();
  };
  const resize = () => {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height);
    camera.aspect = width / height;
    // Preserve responsive framing; camera.zoom supplies the requested 2× close-up.
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
    const limitingFov = Math.min(halfFov, Math.atan(Math.tan(halfFov) * camera.aspect));
    camera.position.set(0, 0, 1.4 / Math.sin(limitingFov) * 1.06);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    schedule();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const onVisibility = () => {
    previousTime = 0;
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      targetPitch = targetYaw = pitch = yaw = 0;
    } else schedule();
  };
  const onContextLost = (event: Event) => {
    event.preventDefault();
    failed = true;
    cancelAnimationFrame(frame);
    frame = 0;
    onStatus('error');
  };
  document.addEventListener('visibilitychange', onVisibility);
  renderer.domElement.addEventListener('webglcontextlost', onContextLost);
  window.addEventListener('blur', reset);
  resize();

  void (async () => {
    try {
      const response = await fetch(src, { signal: request.signal });
      if (!response.ok) throw new Error(`Model request failed: ${response.status}`);
      const data = await response.arrayBuffer();
      if (new DataView(data).getUint32(0, true) !== 0x46546c67) throw new Error('Invalid GLB response');
      if (disposed) return;
      const loaded = await new GLTFLoader().setDRACOLoader(draco).parseAsync(data, '');
      draco.dispose();
      if (disposed) { disposeObject(loaded.scene); return; }
      model = loaded.scene;
      model = prepareModel(loaded.scene);
      scene.add(model);
      const studio = new RoomEnvironment();
      const pmrem = new THREE.PMREMGenerator(renderer);
      try { environment = pmrem.fromScene(studio, 0.04); }
      finally { studio.dispose(); pmrem.dispose(); }
      scene.environment = environment.texture;
      scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2));
      const key = new THREE.DirectionalLight(0xffffff, 3);
      key.position.set(3, 5, 6);
      scene.add(key);
      model.rotation.copy(baseRotation);
      renderer.render(scene, camera);
      onStatus('ready');
      schedule();
    } catch (error) {
      draco.dispose();
      if (!disposed) {
        failed = true;
        onStatus('error');
        console.warn('3D preview unavailable; keeping the project image.', error);
      }
    }
  })();

  return {
    setPointer(x, y) {
      const target = pointerRotation(x, y);
      targetPitch = target.pitch;
      targetYaw = target.yaw;
      previousTime = 0;
      schedule();
    },
    reset,
    setVisible(value) {
      visible = value;
      previousTime = 0;
      if (!value) {
        targetPitch = targetYaw = pitch = yaw = 0;
        cancelAnimationFrame(frame);
        frame = 0;
      } else schedule();
    },
    dispose() {
      disposed = true;
      request.abort();
      draco.dispose();
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', reset);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      if (model) disposeObject(model);
      environment?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
