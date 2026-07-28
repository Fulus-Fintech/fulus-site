import * as THREE from 'three';
import { PORTAL_W, PORTAL_ASPECT } from './portal';

export interface RibbonHandles {
  mesh: THREE.Mesh;
  setFade(v: number): void;
  setTime(t: number): void;
}

// --- shaders verbatim from prototype.html ---
const RIBBON_VERTEX = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`;

const RIBBON_FRAGMENT = /* glsl */ `
    varying vec2 vUv; uniform float uTime; uniform float uFade;
    void main(){
      vec3 cyan = vec3(0., .898, 1.); vec3 teal = vec3(0., 1., .698);
      vec3 col = mix(cyan, teal, vUv.x);
      float pulse = .55 + .45 * sin(vUv.x * 40. - uTime * 2.2);
      float rim = smoothstep(0., .5, vUv.y) * smoothstep(1., .5, vUv.y);
      gl_FragColor = vec4(col * (1.3 + pulse * 1.1), rim * .8 * uFade);
    }`;

export function createRibbon(): RibbonHandles {
  const PH = PORTAL_W * PORTAL_ASPECT;
  // The river of light: near-camera into the threshold. Points verbatim.
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(2.6, 0.5, 4.5),
    new THREE.Vector3(-2.0, 1.1, 0.0),
    new THREE.Vector3(2.2, 1.7, -4.5),
    new THREE.Vector3(-1.6, 1.4, -9.0),
    new THREE.Vector3(0.2, 2.3, -12.2),
    new THREE.Vector3(0.3, PH * 0.5, -13.85),
  ]);
  const geo = new THREE.TubeGeometry(curve, 260, 0.028, 10, false);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uFade: { value: 1 } },
    vertexShader: RIBBON_VERTEX,
    fragmentShader: RIBBON_FRAGMENT,
  });
  const mesh = new THREE.Mesh(geo, mat);
  return {
    mesh,
    setFade(v: number): void { mat.uniforms.uFade.value = v; },
    setTime(t: number): void { mat.uniforms.uTime.value = t; },
  };
}
