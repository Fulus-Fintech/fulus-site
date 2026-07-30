import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

export interface EnvHandles {
  ripple: { mesh: THREE.Mesh; setTime(t: number): void };
  shafts: THREE.Mesh;
  grain: ShaderPass;
  setTime(t: number): void;
}

// Water-surface ripple: a transparent shader plane just above the mirror.
// Low-frequency value noise, additive cyan crests at amplitude 0.015 —
// barely perceptible; water that remembers it is water. Drift offsets move
// at 0.05 noise-units/s (one cell per ~20s): far below the 0.5Hz ceiling.
//
// G3 QA round 1 — the ripple read as a mechanical 1-2px scanline texture over
// the portal's light pour and out to the far field. That is not "too strong",
// it is ALIASING: a 400-unit plane carrying 140 noise cells is far below one
// cell per pixel at grazing angles, and procedural noise has no mipmaps to fall
// back on. Two changes, both at the source: fewer, larger cells (80 over 400
// units ≈ 5 world-units a cell), and the crests now dissolve with view distance
// the way everything else in this world dissolves into the fog — the water only
// remembers it is water where the eye can actually resolve it. Amplitude halved
// per the tuning doctrine on top of that.
export function createRipple(): { mesh: THREE.Mesh; setTime(t: number): void } {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      varying vec2 vUv; varying float vDepth;
      void main(){
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.);
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec2 vUv; varying float vDepth; uniform float uTime;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3. - 2. * f);
        return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x),
                   mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y);
      }
      void main(){
        vec2 p = vUv * 80.;
        float n = noise(p + vec2(uTime * .05, uTime * .031)) * .6
                + noise(p * 2.3 - vec2(uTime * .042, 0.)) * .4;
        float crest = smoothstep(.68, .97, n);
        float reach = 1. - smoothstep(6., 19., vDepth); // dissolves into the fog before it can alias
        gl_FragColor = vec4(vec3(0., .898, 1.), crest * reach * .015);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.02;
  return { mesh, setTime: (t) => { mat.uniforms.uTime.value = t; } };
}

// Film grain + vignette + the subtle colour grade (spec §5.2): shadows cooled
// toward the deep teal, highlights honest. This pass runs BEFORE the bloom —
// see the G3 QA note in scene.ts. It therefore works in LINEAR light and must
// NOT convert colour space: the bloom pass ends the chain and encodes.
//
// grain: multiplied by (luma + .02) rather than added flat. Flat linear noise
// is a noise-storm in the shadows (±.035 linear encodes to ±.21 sRGB down
// there) and invisible in the highlights — film is the other way round. This
// shape lands at roughly ±4/255 in the midtones and a ±3/255 whisper in the
// blacks: film, at every level of the frame.
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
        col.rgb += (rand(vUv + mod(uTime, 7.13)) - .5) * .05 * (luma + .02);
        float vig = smoothstep(.9, .55, distance(vUv, vec2(.5)));
        col.rgb *= vig;
        gl_FragColor = col;
      }`,
  });
}

// Light-shaft quad in the pour of the door: an additive gradient plane
// angled from the portal base along the floor toward the camera path.
//
// G3 QA round 1 (kill-class: bounded-plane shaft) — the gradient ran along v
// only, so the quad kept two razor-straight SIDE edges and a bright far edge.
// At the 0.5 stop the near end passes the camera, which throws those edges
// across the whole lower frame: a hard ~34-luma step slicing the cast's
// reflections, reading as a lit quad laid on the floor. Light pouring as a
// presence has no boundary anywhere, so the falloff is now baked on all four
// sides of the texture (same doctrine as the portal halo's radial texture:
// the geometry must be cut where the alpha is already zero).
export function createShafts(): THREE.Mesh {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 256;
  const x = c.getContext('2d'); // jsdom guard, as in cast.ts
  if (x) {
    const g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, 'rgba(0,229,255,0)');      // canvas top = v=1 = the far edge: nothing to see at the cut
    g.addColorStop(0.12, 'rgba(0,229,255,0.85)'); // the pour, just inside the portal's foot
    g.addColorStop(0.55, 'rgba(0,229,255,0.28)');
    g.addColorStop(1, 'rgba(0,229,255,0)');      // gone before it reaches the camera
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 256);
    // ...and across, so the sides dissolve too — a wide soft core, zero at both edges
    const across = x.createLinearGradient(0, 0, 64, 0);
    across.addColorStop(0, 'rgba(0,0,0,1)');
    across.addColorStop(0.22, 'rgba(0,0,0,0.34)');
    across.addColorStop(0.5, 'rgba(0,0,0,0)');
    across.addColorStop(0.78, 'rgba(0,0,0,0.34)');
    across.addColorStop(1, 'rgba(0,0,0,1)');
    x.globalCompositeOperation = 'destination-out';
    x.fillStyle = across;
    x.fillRect(0, 0, 64, 256);
    x.globalCompositeOperation = 'source-over';
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
