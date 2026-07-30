import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

export interface EnvHandles {
  ripple: { mesh: THREE.Mesh; setTime(t: number): void };
  shafts: THREE.Mesh;
  grain: ShaderPass;
  setTime(t: number): void;
}

// Water-surface ripple: a transparent shader plane just above the mirror.
// Low-frequency value noise, additive cyan crests at amplitude 0.03 —
// barely perceptible; water that remembers it is water. Drift offsets move
// at 0.05 noise-units/s (one cell per ~20s): far below the 0.5Hz ceiling.
export function createRipple(): { mesh: THREE.Mesh; setTime(t: number): void } {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `
      varying vec2 vUv; uniform float uTime;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3. - 2. * f);
        return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x),
                   mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y);
      }
      void main(){
        vec2 p = vUv * 140.;
        float n = noise(p + vec2(uTime * .05, uTime * .031)) * .6
                + noise(p * 2.3 - vec2(uTime * .042, 0.)) * .4;
        float crest = smoothstep(.68, .97, n);
        gl_FragColor = vec4(vec3(0., .898, 1.), crest * .03);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.02;
  return { mesh, setTime: (t) => { mat.uniforms.uTime.value = t; } };
}

// Film grain + vignette as the final post pass, carrying the subtle colour
// grade (spec §5.2): shadows cooled toward the deep teal, highlights honest.
// grain = (rand(uv + t) - .5) * .035 ; vignette = smoothstep(0.9 -> 0.55) radial.
export function createGrainPass(): ShaderPass {
  return new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `
      varying vec2 vUv; uniform sampler2D tDiffuse; uniform float uTime;
      float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec4 col = texture2D(tDiffuse, vUv);
        // subtle colour grade (spec §5.2): shadows lean toward the deep teal,
        // highlights stay honest — a whisper under the ACES output, never a filter
        float luma = dot(col.rgb, vec3(.299, .587, .114));
        col.rgb = mix(col.rgb * vec3(.94, 1.02, 1.06), col.rgb, smoothstep(.0, .55, luma));
        float grain = (rand(vUv + mod(uTime, 7.13)) - .5) * .035;
        col.rgb += grain;
        float vig = smoothstep(.9, .55, distance(vUv, vec2(.5)));
        col.rgb *= vig;
        gl_FragColor = col;
      }`,
  });
}

// Light-shaft quad in the pour of the door: an additive gradient plane
// angled from the portal base along the floor toward the camera path.
export function createShafts(): THREE.Mesh {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const x = c.getContext('2d'); // jsdom guard, as in cast.ts
  if (x) {
    const g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, 'rgba(0,229,255,0.85)');   // canvas top = v=1 = the portal end
    g.addColorStop(0.55, 'rgba(0,229,255,0.28)');
    g.addColorStop(1, 'rgba(0,229,255,0)');      // gone before it reaches the camera
    x.fillStyle = g;
    x.fillRect(0, 0, 4, 256);
  }
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 7),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(c),
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  mesh.rotation.x = -Math.PI / 2 + 0.24; // lies along the floor, far end lifted toward the portal base
  mesh.position.set(0, 0.55, -10.4);     // pours from the portal plane (z=-14) toward the path
  return mesh;
}

// Depth-graded mote sizes (spec §5.2): near motes read larger, far motes
// smaller pinpricks — the field gains depth. Replaces the dust's uniform-size
// PointsMaterial with a per-mote attribute; same cyan, same additive calm,
// density unchanged. Static geometry: zero per-frame cost, nothing to shed.
export function gradeMotes(dust: THREE.Points): void {
  const pos = dust.geometry.getAttribute('position');
  const sizes = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const near = (pos.getZ(i) + 36) / 44; // z runs 8 (near) .. -36 (far) -> 1 .. 0
    sizes[i] = 0.02 + near * 0.03;        // 0.05 world-units near -> 0.02 far
  }
  dust.geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  const old = dust.material as THREE.Material;
  dust.material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uOpacity: { value: 0.5 } },
    vertexShader: `
      attribute float aSize;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.);
        gl_PointSize = aSize * 450. / -mv.z; // 450 ~ PointsMaterial's perspective scale at the 900px reference viewport
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uOpacity;
      void main(){
        float d = distance(gl_PointCoord, vec2(.5));
        float a = smoothstep(.5, .15, d); // round soft sprite, never a square point
        gl_FragColor = vec4(0., .898, 1., a * uOpacity);
      }`,
  });
  old.dispose();
}

export function createEnvironment(): EnvHandles {
  const ripple = createRipple();
  const shafts = createShafts();
  const grain = createGrainPass();
  return {
    ripple,
    shafts,
    grain,
    setTime(t: number) {
      ripple.setTime(t);
      grain.uniforms.uTime.value = t;
    },
  };
}
