import * as THREE from 'three';

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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 1.6, 6.2);
  camera.lookAt(0, 0.7, 0);

  scene.add(new THREE.HemisphereLight(0xfff3d6, 0x0d3b2e, 1.1));
  const rim = new THREE.DirectionalLight(0xe7cf9a, 2.2);
  rim.position.set(-3.5, 4, -2.5);
  scene.add(rim);
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 5, 4);
  scene.add(key);

  const group = new THREE.Group();
  scene.add(group);

  const brass = new THREE.MeshStandardMaterial({
    color: 0x8a6a25,
    metalness: 0.85,
    roughness: 0.32,
  });
  const brassDark = new THREE.MeshStandardMaterial({
    color: 0x5c451a,
    metalness: 0.8,
    roughness: 0.45,
  });

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
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), brass);
  group.add(body);

  // Rim torus + lid + knob
  const rimRing = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.09, 16, 48), brassDark);
  rimRing.rotation.x = Math.PI / 2;
  rimRing.position.y = 1.62;
  group.add(rimRing);
  const lid = new THREE.Mesh(new THREE.SphereGeometry(0.88, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2.6), brass);
  lid.position.y = 1.6;
  group.add(lid);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), brassDark);
  knob.position.y = 2.5;
  group.add(knob);

  // Platter
  const platter = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.9, 0.12, 48), brassDark);
  platter.position.y = -0.08;
  group.add(platter);

  // Steam particles
  const COUNT = 120;
  const positions = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 1.1;
    positions[i * 3 + 1] = 1.7 + Math.random() * 2.2;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 1.1;
    seeds[i] = Math.random() * Math.PI * 2;
  }
  const steamGeo = new THREE.BufferGeometry();
  steamGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const steam = new THREE.Points(
    steamGeo,
    new THREE.PointsMaterial({
      color: 0xfaf5ea,
      size: 0.06,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
  );
  group.add(steam);

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
    targetTiltY = nx * 0.35;
    targetTiltX = ny * 0.22;
  };
  const onScroll = (): void => {
    const r = canvas.getBoundingClientRect();
    const progress = Math.min(Math.max(-r.top / window.innerHeight, 0), 1);
    scrollDolly = progress * 1.2;
  };
  const onVisibility = (): void => {
    visible = document.visibilityState === 'visible';
    if (visible && !opts.reducedMotion) loop();
  };
  const io = new IntersectionObserver(
    (entries) => {
      visible = entries[0]?.isIntersecting ?? true;
      if (visible && !opts.reducedMotion) loop();
    },
    { threshold: 0.05 },
  );
  io.observe(canvas);

  function resize(): void {
    const w = canvas.clientWidth || 480;
    const h = canvas.clientHeight || 420;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', onMouse);
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);

  const clock = new THREE.Clock();

  function frame(): void {
    const t = clock.getElapsedTime();
    tiltX += (targetTiltX - tiltX) * 0.05;
    tiltY += (targetTiltY - tiltY) * 0.05;
    group.rotation.y = t * 0.25 + tiltY;
    group.rotation.x = tiltX * 0.6;
    camera.position.z = 6.2 - scrollDolly;
    const pos = steamGeo.getAttribute('position') as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3] += Math.sin(t * 1.4 + seeds[i]) * 0.0012;
      arr[i * 3 + 1] += 0.004;
      if (arr[i * 3 + 1] > 4.1) arr[i * 3 + 1] = 1.7;
    }
    pos.needsUpdate = true;
    renderer.render(scene, camera);
  }

  function loop(): void {
    if (disposed) return;
    if (!visible || document.visibilityState !== 'visible') return;
    frame();
    raf = requestAnimationFrame(loop);
  }

  if (opts.reducedMotion) {
    frame();
  } else {
    loop();
  }

  return {
    dispose(): void {
      disposed = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      steamGeo.dispose();
      renderer.dispose();
    },
  };
}
