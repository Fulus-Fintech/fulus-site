import * as THREE from 'three';
import { PORTAL_W, PORTAL_ASPECT } from './portal';

export interface RibbonHandles {
  mesh: THREE.Mesh;
  setFade(v: number): void;
  setTime(t: number): void;
}

// --- shaders from prototype.html (colour, pulse and rim verbatim) ---
// G3 QA round 1 (kill-class: visible quad edge / horizon-seam read) — the rim
// term fades the tube along its SEAM, not along its silhouette, so the band
// ended in a dead-straight 1px cliff (measured 179 -> 67 in a single row at the
// 0.5 stop, running to the frame edge: it read as a lit plane meeting the dark
// floor, i.e. a false horizon). A river of light has no cut edge, so the tube
// now also fades where its surface turns away from the eye — the silhouette
// dissolves instead of stopping.
const RIBBON_VERTEX = /* glsl */ `
    varying vec2 vUv; varying vec3 vNormalV; varying vec3 vViewV;
    void main(){
      vUv = uv;
      vec4 mv = modelViewMatrix * vec4(position, 1.);
      vNormalV = normalMatrix * normal;
      vViewV = -mv.xyz;
      gl_Position = projectionMatrix * mv;
    }`;

const RIBBON_FRAGMENT = /* glsl */ `
    varying vec2 vUv; varying vec3 vNormalV; varying vec3 vViewV;
    uniform float uTime; uniform float uFade;
    void main(){
      vec3 cyan = vec3(0., .898, 1.); vec3 teal = vec3(0., 1., .698);
      vec3 col = mix(cyan, teal, vUv.x);
      float pulse = .55 + .45 * sin(vUv.x * 40. - uTime * 2.2);
      float rim = smoothstep(0., .5, vUv.y) * smoothstep(1., .5, vUv.y);
      float facing = abs(dot(normalize(vNormalV), normalize(vViewV)));
      gl_FragColor = vec4(col * (1.3 + pulse * 1.1), rim * smoothstep(0., .8, facing) * .8 * uFade);
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
  // radial segments 10 -> 16 (G3 QA): with 10 facets the silhouette facet's
  // normal is still 18° off perpendicular, so the fade above could not reach
  // zero at the edge and left a residual step. Geometry-only, ~2k extra verts.
  const geo = new THREE.TubeGeometry(curve, 260, 0.028, 16, false);
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
