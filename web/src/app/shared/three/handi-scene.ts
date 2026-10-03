import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export interface HandiSceneHandle {
  dispose(): void;
}

/**
 * Procedural royal handi (biryani pot) fallback scene — used when no GLB model
 * is available (`Package.Model3DUrl` allows GLB uploads later).
 * Performance: DPR capped, pauses off-screen / on tab hide, one static frame
 * when reduced motion is requested.
 */
export function createHandiScene(
  canvas: HTMLCanvasElement,
  opts: { reducedMotion: boolean },
): HandiSceneHandle {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environmentMap = pmrem.fromScene(environment, 0.04);
  scene.environment = environmentMap.texture;
  environment.dispose();
  pmrem.dispose();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 2.7, 6.7);
  camera.lookAt(0, 1.05, 0);

  scene.add(new THREE.HemisphereLight(0xfff5e8, 0x600b01, 1.5));
  const rim = new THREE.DirectionalLight(0xe7cf9a, 2.2);
  rim.position.set(-3.5, 4, -2.5);
  scene.add(rim);
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 5, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(512, 512);
  key.shadow.camera.left = -4;
  key.shadow.camera.right = 4;
  key.shadow.camera.top = 4;
  key.shadow.camera.bottom = -4;
  key.shadow.bias = -0.001;
  scene.add(key);

  const group = new THREE.Group();
  scene.add(group);

  const brass = new THREE.MeshStandardMaterial({
    color: 0xbba58e,
    metalness: 0.82,
    roughness: 0.28,
  });
  const brassDark = new THREE.MeshStandardMaterial({
    color: 0xb88b32,
    metalness: 0.78,
    roughness: 0.3,
  });
  const enamel = new THREE.MeshPhysicalMaterial({ color: 0x600b01, metalness: 0.2, roughness: 0.36, clearcoat: 0.3, clearcoatRoughness: 0.25 });

  // Handi body (lathe profile)
  const pts: THREE.Vector2[] = [];
  const profile: Array<[number, number]> = [
    [0.01, 0],
    [0.7, 0],
    [1.05, 0.25],
    [1.25, 0.7],
    [1.3, 1.1],
    [1.15, 1.45],
    [0.9, 1.6],
  ];
  for (const [x, y] of profile) pts.push(new THREE.Vector2(x, y));
  const profileCurve = new THREE.SplineCurve(pts);
  const body = new THREE.Mesh(new THREE.LatheGeometry(profileCurve.getPoints(64), 64), brass);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Rim torus + lid + knob
  const rimRing = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.09, 16, 48), brassDark);
  rimRing.rotation.x = Math.PI / 2;
  rimRing.position.y = 1.62;
  group.add(rimRing);
  const lid = new THREE.Mesh(new THREE.SphereGeometry(0.88, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2.6), enamel);
  lid.position.y = 1.6;
  lid.scale.y = 0.42;
  lid.castShadow = true;
  group.add(lid);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), brassDark);
  knob.position.y = 2.08;
  knob.scale.y = 0.6;
  group.add(knob);

  // Platter
  const platter = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.06, 48), new THREE.MeshStandardMaterial({ color: 0x8b7664, metalness: 0.7, roughness: 0.4 }));
  platter.position.y = -0.08;
  group.add(platter);
  const band = new THREE.Mesh(new THREE.TorusGeometry(1.13, 0.035, 12, 64), enamel);
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.35;
  group.add(band);
  for (const side of [-1, 1]) {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.055, 12, 32), brassDark);
    handle.position.set(side * 1.35, 1.25, 0);
    handle.castShadow = true;
    group.add(handle);
  }
  const medallion = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.035, 32), enamel);
  medallion.rotation.x = Math.PI / 2;
  medallion.position.set(0, 0.95, 1.3);
  group.add(medallion);
  const sealRim = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.018, 8, 32), brassDark);
  sealRim.position.copy(medallion.position);
  sealRim.position.z += 0.025;
  group.add(sealRim);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.ShadowMaterial({ opacity: 0.25 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.16;
  shadow.receiveShadow = true;
  scene.add(shadow);

  let tiltX = 0;
  let tiltY = 0;
  let targetTiltX = 0;
  let targetTiltY = 0;
  let scrollDolly = 0;
  let visible = true;
  let raf = 0;
  let disposed = false;

  const onMouse = (e: MouseEvent): void => {
    const r = canvas.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
    targetTiltY = THREE.MathUtils.clamp(nx, -1, 1) * 0.12;
    targetTiltX = THREE.MathUtils.clamp(ny, -1, 1) * 0.07;
  };
  const onScroll = (): void => {
    const r = canvas.getBoundingClientRect();
    const progress = Math.min(Math.max(-r.top / window.innerHeight, 0), 1);
    scrollDolly = progress * 0.15;
  };
  const onVisibility = (): void => {
    visible = document.visibilityState === 'visible';
    if (visible && !opts.reducedMotion) resume();
  };
  const io = new IntersectionObserver(
    (entries) => {
      visible = entries[0]?.isIntersecting ?? true;
      if (visible && !opts.reducedMotion) resume();
    },
    { threshold: 0.05 },
  );
  io.observe(canvas);

  function resize(): void {
    const w = canvas.clientWidth || 480;
    const h = canvas.clientHeight || 420;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = 6.7 / Math.min(camera.aspect, 1);
    camera.updateProjectionMatrix();
    if (opts.reducedMotion) renderer.render(scene, camera);
  }
  resize();
  window.addEventListener('resize', resize);
  canvas.addEventListener('mousemove', onMouse);
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);

  const clock = new THREE.Clock();

  function frame(): void {
    const t = clock.getElapsedTime();
    tiltX += (targetTiltX - tiltX) * 0.05;
    tiltY += (targetTiltY - tiltY) * 0.05;
    group.rotation.y = Math.sin(t * 0.22) * 0.13 + tiltY;
    group.rotation.x = tiltX * 0.6;
    camera.position.z = 6.7 / Math.min(camera.aspect, 1) - scrollDolly;
    renderer.render(scene, camera);
  }

  function loop(): void {
    raf = 0;
    if (disposed) return;
    if (!visible || document.visibilityState !== 'visible') return;
    frame();
    raf = requestAnimationFrame(loop);
  }
  function resume(): void {
    if (!raf && !disposed && visible && document.visibilityState === 'visible') raf = requestAnimationFrame(loop);
  }

  if (opts.reducedMotion) {
    frame();
  } else {
    resume();
  }

  return {
    dispose(): void {
      disposed = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', onMouse);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      scene.traverse(object => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => material.dispose());
        }
      });
      environmentMap.dispose();
      renderer.dispose();
    },
  };
}
