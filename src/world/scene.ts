import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { createPortal, type PortalHandles } from './portal';
import { createRibbon, type RibbonHandles } from './ribbon';
import { createCast } from './cast';

export interface WorldHandles {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  mirror: Reflector;
  veil: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  beyond: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  beyondRef: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  dust: THREE.Points;
  portal: PortalHandles;
  ribbon: RibbonHandles;
  cast: THREE.Group;
  setSize(w: number, h: number): void;
  dispose(): void;
}

const NIGHT = 0x020b18; // Deep Ocean Night — brandbook constitution
const FOG_DENSITY = 0.052; // prototype verbatim

// "The beyond": soft light horizon inside — radial texture, never a bounded
// plane, so the horizon can never show a seam (kill-class from QA history).
function makeBeyondTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) { // jsdom guard
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(190,255,240,0.55)');
    g.addColorStop(0.45, 'rgba(0,229,255,0.22)');
    g.addColorStop(1, 'rgba(0,229,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  }
  return new THREE.CanvasTexture(c);
}

export function createWorld(canvas: HTMLCanvasElement): WorldHandles {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(NIGHT);
  scene.fog = new THREE.FogExp2(NIGHT, FOG_DENSITY);

  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 200);

  // floor: black mirror, fog-swallowed edges
  const mirror = new Reflector(new THREE.PlaneGeometry(400, 400), {
    clipBias: 0.003,
    textureWidth: 1024,
    textureHeight: 1024,
    color: 0x0a1622,
  });
  mirror.rotation.x = -Math.PI / 2;
  mirror.position.y = 0;
  scene.add(mirror);

  // dark veil over the mirror so reflections stay deep, not literal.
  // QA LAW: its colour follows the fog colour (the flight updates it) — that
  // fix killed the dead-slab floor.
  const veil = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshBasicMaterial({ color: NIGHT, transparent: true, opacity: 0.58 }),
  );
  veil.rotation.x = -Math.PI / 2;
  veil.position.y = 0.01;
  scene.add(veil);

  // the portal, mid-distance at the crossing plane
  const portal = createPortal();
  portal.group.position.set(0, 0, -14);
  scene.add(portal.group);

  // the ribbon of light
  const ribbon = createRibbon();
  scene.add(ribbon.mesh);

  // the beyond + its reflection in the water
  const beyondTex = makeBeyondTexture();
  const beyond = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 22),
    new THREE.MeshBasicMaterial({ map: beyondTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  beyond.position.set(0, 3.2, -34);
  scene.add(beyond);

  const beyondRef = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 22),
    new THREE.MeshBasicMaterial({ map: beyondTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  beyondRef.position.set(0, -3.0, -33.8);
  beyondRef.scale.y = -1;
  scene.add(beyondRef);

  // dust: 650 drifting light-motes
  const N = 650;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 40;
    pos[i * 3 + 1] = Math.random() * 7;
    pos[i * 3 + 2] = 8 - Math.random() * 44;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({ color: 0x00e5ff, size: 0.035, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  scene.add(dust);

  // the canon cast, standing in the night (spec §5.1)
  const cast = createCast();
  scene.add(cast);

  // post: ACES render + UnrealBloom (.85 strength = flight formula at prog 0; radius .55, threshold .82)
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.85, 0.55, 0.82);
  composer.addPass(bloom);

  return {
    renderer, scene, camera, composer, bloom, mirror, veil, beyond, beyondRef, dust, portal, ribbon, cast,
    setSize(w: number, h: number): void {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    },
    dispose(): void {
      // Material.dispose() does NOT cascade to its `map` texture (e.g. the
      // portal halo's / beyond's CanvasTexture) — free it explicitly or it
      // leaks every dispose() cycle.
      const disposeMaterial = (m: THREE.Material): void => {
        (m as THREE.Material & { map?: THREE.Texture | null }).map?.dispose();
        m.dispose();
      };
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach(disposeMaterial);
        else if (mat) disposeMaterial(mat);
      });
      cast.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
      beyondTex.dispose();
      mirror.dispose(); // releases the Reflector render target
      // EffectComposer.dispose() only frees its own render targets + copyPass
      // — it never iterates passes, so UnrealBloomPass's render targets,
      // materials, and fsQuad would leak without disposing each pass too.
      composer.passes.forEach((p) => p.dispose());
      composer.dispose();
      renderer.dispose();
    },
  };
}
