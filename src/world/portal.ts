import * as THREE from 'three';

// Brand geometry law: the portal is a 1:1.27 parallelogram leaning 20°.
// Values verbatim from the normative prototype (PW = 2.5, PH = PW * 1.27, shear tan(20°)).
export const PORTAL_W = 2.5;
export const PORTAL_ASPECT = 1.27;
export const LEAN_DEG = 20;

export interface PortalHandles {
  group: THREE.Group;
  setDim(v: number): void;
  setTime(t: number): void;
}

// --- shaders verbatim from prototype.html ---
const PORTAL_VERTEX = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`;

const PORTAL_FRAGMENT = /* glsl */ `
    varying vec2 vUv; uniform float uTime; uniform float uDim;
    void main(){
      vec3 cyan = vec3(0.0, 0.898, 1.0); vec3 teal = vec3(0.0, 1.0, 0.698);
      float depth = smoothstep(0., 1., vUv.y);
      vec3 col = mix(cyan * 1.8, teal * 1.15, depth);
      float core = smoothstep(.55, .0, distance(vUv, vec2(.5, .18)));
      col += vec3(.75, 1., .95) * core * .85;
      float shimmer = .06 * sin(vUv.y * 26. - uTime * 1.6);
      col *= (1. + shimmer);
      float edge = smoothstep(.0, .06, vUv.x) * smoothstep(1., .94, vUv.x) * smoothstep(.0, .05, vUv.y) * smoothstep(1., .95, vUv.y);
      col *= mix(.4, 1., edge);
      gl_FragColor = vec4(col * uDim, 1.);
    }`;

// Halo behind the portal — radial gradient texture so it has NO visible bounds
// (kill-class from QA history: bounded-plane halo). Stops verbatim from prototype.
// G2 QA round 2: the halo quad crosses the water plane (its bottom sits at world
// y ≈ -2.86), and the opaque floor depth-clips the additive glow exactly along
// the waterline — a hard horizontal sky/floor junction across the far field.
// Dissolve the glow to zero just above world y=0 inside the texture so the
// geometric cut happens where the alpha is already 0; the water still carries
// the halo through its real mirror reflection.
function makeHaloTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) { // jsdom guard: unit tests have no 2d context; real browsers always do
    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(51,51,242,0.32)');
    grad.addColorStop(0.5, 'rgba(51,51,242,0.10)');
    grad.addColorStop(1, 'rgba(51,51,242,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    // canvas row of a world height on the halo quad (center world y = PH*0.7,
    // quad height PH*3.2 — must match createPortal's halo geometry/position)
    const PH = PORTAL_W * PORTAL_ASPECT;
    const rowOf = (worldY: number): number => 256 * (0.5 + (PH * 0.7 - worldY) / (PH * 3.2));
    const fade = ctx.createLinearGradient(0, rowOf(0.9), 0, rowOf(0));
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = fade;
    ctx.fillRect(0, rowOf(0.9), 256, 256 - rowOf(0.9)); // gradient clamps to full erase below rowOf(0)
    ctx.globalCompositeOperation = 'source-over';
  }
  return new THREE.CanvasTexture(c);
}

export function createPortal(): PortalHandles {
  const PH = PORTAL_W * PORTAL_ASPECT;
  const group = new THREE.Group();

  const geo = new THREE.PlaneGeometry(PORTAL_W, PH, 1, 1);
  const shear = new THREE.Matrix4().makeShear(0, 0, Math.tan(THREE.MathUtils.degToRad(LEAN_DEG)), 0, 0, 0);
  geo.applyMatrix4(shear);

  const mat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uDim: { value: 1 } },
    vertexShader: PORTAL_VERTEX,
    fragmentShader: PORTAL_FRAGMENT,
  });

  const face = new THREE.Mesh(geo, mat);
  face.position.y = PH / 2;
  group.add(face);

  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(PORTAL_W * 5, PH * 3.2),
    new THREE.MeshBasicMaterial({
      map: makeHaloTexture(),
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  halo.position.set(0.4, PH * 0.7, -0.5);
  group.add(halo);

  return {
    group,
    setDim(v: number): void { mat.uniforms.uDim.value = v; },
    setTime(t: number): void { mat.uniforms.uTime.value = t; },
  };
}
