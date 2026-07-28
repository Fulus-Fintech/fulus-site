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
