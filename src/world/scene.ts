import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { createPortal, type PortalHandles } from './portal';
import { createRibbon, type RibbonHandles } from './ribbon';
import { createCast } from './cast';
import { createEnvironment, gradeMotes, type EnvHandles } from './environment';

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
  env: EnvHandles;
  setSize(w: number, h: number): void;
  dispose(): void;
}

const NIGHT = 0x020b18; // Deep Ocean Night — brandbook constitution
const FOG_DENSITY = 0.052; // prototype verbatim

// G2 QA round 2: the stock ReflectorShader has no fog support, so the mirror
// rode at full reflection brightness all the way to its far edge — the horizon
// read as stacked banded seams (unfogged reflection against fogged veil/sky),
// and far-field reflection detail (the ribbon's mirrored band) kept hard,
// stair-stepped edges instead of dissolving into the night. This variant is the
// stock shader with the scene's fog threaded through the water surface, exactly
// like every fogged material (fog_fragment after tonemapping, meshbasic order).
const FOGGED_REFLECTOR_SHADER = {
  name: 'FoggedReflectorShader',
  // stock ReflectorShader uniforms (the addon's static isn't in @types/three) + fog
  uniforms: THREE.UniformsUtils.merge([
    THREE.UniformsLib['fog'],
    { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null } },
  ]),
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    #include <common>
    #include <fog_pars_vertex>
    void main() {
      vUv = textureMatrix * vec4( position, 1.0 );
      vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
      gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 color;
    uniform sampler2D tDiffuse;
    varying vec4 vUv;
    #include <fog_pars_fragment>
    float blendOverlay( float base, float blend ) {
      return ( base < 0.5 ? ( 2.0 * base * blend ) : ( 1.0 - 2.0 * ( 1.0 - base ) * ( 1.0 - blend ) ) );
    }
    vec3 blendOverlay( vec3 base, vec3 blend ) {
      return vec3( blendOverlay( base.r, blend.r ), blendOverlay( base.g, blend.g ), blendOverlay( base.b, blend.b ) );
    }
    void main() {
      vec4 base = texture2DProj( tDiffuse, vUv );
      gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      #include <fog_fragment>
    }`,
};

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

  // floor: black mirror, fog-swallowed edges (FOGGED_REFLECTOR_SHADER — the
  // stock shader ignores fog and broke exactly that law at the horizon)
  const mirror = new Reflector(new THREE.PlaneGeometry(400, 400), {
    clipBias: 0.003,
    textureWidth: 1024,
    textureHeight: 1024,
    color: 0x0a1622,
    shader: FOGGED_REFLECTOR_SHADER,
  });
  (mirror.material as THREE.ShaderMaterial).fog = true; // opt into scene.fog uniforms (USE_FOG) — flight's fog colour/density changes flow through
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
  // G2 QA round 2: the composer replaces the default framebuffer, so the
  // renderer's `antialias: true` never applied to the composed frame — every
  // edge staircased at 1x (stair-stepped monolith top, serrated seams). A 4x
  // multisampled target restores edge AA through the post chain (WebGL2 is
  // guaranteed: shouldBootWorld only boots the world on webgl2).
  const composer = new EffectComposer(
    renderer,
    new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { samples: 4, type: THREE.HalfFloatType }),
  );
  composer.setSize(window.innerWidth, window.innerHeight); // scale the target to the device pixel ratio (the constructor stores the raw target size)
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.85, 0.55, 0.82);
  composer.addPass(bloom);

  const env = createEnvironment();
  scene.add(env.ripple.mesh);
  scene.add(env.shafts);
  composer.addPass(env.grain); // final pass: grain + vignette + colour grade over everything
  gradeMotes(dust);            // depth-graded mote sizes (spec §5.2) — swaps the dust material in place

  return {
    renderer, scene, camera, composer, bloom, mirror, veil, beyond, beyondRef, dust, portal, ribbon, cast, env,
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
