import * as THREE from 'three';

// The canon cast in the night (spec §5.1). Billboarding OFF: fixed world
// orientation, each figure faces a point on the camera path. Heights are
// silhouette heights in world units, feet at y=0. The pair converses before
// the door, the walker crosses alone on the right, and the huddle of three
// gathers at the threshold.
interface FigureSpec {
  name: string;
  url: string;
  height: number;
  position: [number, number, number];
  face: [number, number]; // x,z point on/near the camera path to face (y=0 keeps them upright)
  glow: [string, string]; // authored backlight pool: [core, secondary] — matches the character's approved rims
}

const FIGURES: FigureSpec[] = [
  { name: 'fig-connector',  url: '/assets/images/cast/connector.webp',  height: 1.85, position: [-3.6, 0, -5.9],  face: [0.9, -2],    glow: ['#00E5FF', '#F800FF'] },
  { name: 'fig-operator',   url: '/assets/images/cast/operator.webp',   height: 1.95, position: [-2.7, 0, -6.2],  face: [0.7, -2.2],  glow: ['#00FFB2', '#00E5FF'] },
  { name: 'fig-walker',     url: '/assets/images/cast/walker.webp',     height: 1.9,  position: [2.8, 0, -9.5],   face: [-0.6, -7],   glow: ['#00E5FF', '#00FFB2'] },
  { name: 'fig-strategist', url: '/assets/images/cast/strategist.webp', height: 1.85, position: [-3.1, 0, -11.6], face: [0.2, -8],    glow: ['#00E5FF', '#F800FF'] },
  { name: 'fig-anchor',     url: '/assets/images/cast/anchor.webp',     height: 1.95, position: [-2.2, 0, -12.2], face: [0, -8.2],    glow: ['#00E5FF', '#00FFB2'] },
  { name: 'fig-visionary',  url: '/assets/images/cast/visionary.webp',  height: 1.9,  position: [-1.5, 0, -11.5], face: [0.4, -7.8],  glow: ['#F800FF', '#00E5FF'] },
];

// 2d-context guard: jsdom (unit tests) has no canvas 2d context; the guard
// keeps createCast constructible there. In the browser the textures paint.
function poolTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  if (x) {
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,0.9)');
    g.addColorStop(0.6, 'rgba(0,0,0,0.35)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(c);
}

// Authored backlight pool: soft radial gradient in the character's approved
// rim colours. In canon art every figure is staged against glow — the black
// body reads because it occludes a bright backdrop. Alphas are baked into the
// gradient; overall intensity is tuned via material opacity (bloom-safe knob).
function glowTexture(core: string, secondary: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  if (x) {
    const toRgba = (hex: string, a: number) => {
      const n = parseInt(hex.slice(1), 16);
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
    };
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, toRgba(core, 0.8));
    g.addColorStop(0.5, toRgba(secondary, 0.3));
    g.addColorStop(1, toRgba(secondary, 0));
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function reflectionMask(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 128;
  const x = c.getContext('2d');
  if (x) {
    // flipY=true: canvas top = v=1 = the feet edge of the decal
    const g = x.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, 'rgba(255,255,255,1)');   // opaque at the feet
    g.addColorStop(1, 'rgba(255,255,255,0)');   // dissolves away from them
    x.fillStyle = g;
    x.fillRect(0, 0, 4, 128);
  }
  return new THREE.CanvasTexture(c);
}

export function createCast(): THREE.Group {
  const cast = new THREE.Group();
  cast.name = 'cast';
  const loader = new THREE.TextureLoader();
  const poolTex = poolTexture();
  const maskTex = reflectionMask();
  const glowTexCache = new Map<string, THREE.CanvasTexture>();

  for (const spec of FIGURES) {
    const fig = new THREE.Group();
    fig.name = spec.name;
    fig.position.set(...spec.position);

    // --- the figure plane: feet at local y=0, top at spec.height ---
    // opacity starts at 0: THREE.MeshBasicMaterial defaults to opaque white,
    // so without this an untextured plane would flash as a solid white box
    // until the async texture load below resolves (revealed on success).
    const figMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), figMat);
    plane.name = 'figure';
    plane.scale.set(spec.height, spec.height, 1); // width corrected on texture load
    plane.position.y = spec.height / 2;
    plane.renderOrder = 2;
    plane.userData.baseOpacity = 0; // raised to 1 by the loader; see updateCast
    fig.add(plane);

    // --- contact occlusion pool: radial dark decal at the feet ---
    const pool = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, opacity: 0.35, depthWrite: false })
    );
    pool.name = 'pool';
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.015;
    pool.scale.set(spec.height * 0.9, spec.height * 0.45, 1);
    pool.userData.baseOpacity = 0.35;
    fig.add(pool);

    // --- fake floor reflection: mirrored decal lying on the water, fading
    //     away from the feet (persists when the governor sheds the Reflector) ---
    // opacity starts at 0 for the same reason as figMat above: hide the
    // reflection decal until its (cloned, flipped) texture is assigned.
    const refMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      alphaMap: maskTex,
      depthWrite: false,
    });
    const reflection = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), refMat);
    reflection.name = 'reflection';
    reflection.rotation.x = -Math.PI / 2;   // local v=1 edge (the feet) lands at the figure's z
    reflection.position.set(0, 0.02, spec.height / 2); // stretches toward the approaching camera (+z)
    reflection.scale.set(spec.height, spec.height, 1);
    reflection.renderOrder = 1;
    reflection.userData.baseOpacity = 0; // raised to 0.18 by the loader
    fig.add(reflection);

    // --- authored backlight pool: soft oval of the character's rim colours
    //     BEHIND the figure, so the black body reads by occluding glow.
    //     fig.lookAt(face) points local +Z at the camera path, so local -Z is
    //     behind; the default plane orientation (facing +Z) faces the camera. ---
    const glowKey = spec.glow.join('/');
    let glowTex = glowTexCache.get(glowKey);
    if (!glowTex) {
      glowTex = glowTexture(spec.glow[0], spec.glow[1]);
      glowTexCache.set(glowKey, glowTex);
    }
    const backglow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: glowTex,
        transparent: true,
        opacity: 0.55, // bloom-safe knob: lower this, not the gradient alphas
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    backglow.name = 'backglow';
    backglow.position.set(0, spec.height * 0.55, -0.4);
    backglow.scale.set(spec.height * 1.7, spec.height * 1.4, 1); // oval, wider than tall
    backglow.renderOrder = 0; // behind reflection=1 and figure=2
    backglow.userData.baseOpacity = 0.55;
    fig.add(backglow);

    // fixed world orientation facing the camera path — billboarding OFF
    fig.lookAt(spec.face[0], 0, spec.face[1]);

    // async texture fill; onError swallowed so jsdom tests stay silent
    loader.load(
      spec.url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        const aspect = tex.image.width / tex.image.height;
        const w = spec.height * aspect;
        figMat.map = tex;
        figMat.opacity = 1;
        plane.userData.baseOpacity = 1;
        figMat.needsUpdate = true;
        plane.scale.set(w, spec.height, 1);
        // vertically flipped copy for the reflection: feet meet feet
        const rtex = tex.clone();
        rtex.repeat.y = -1;
        rtex.offset.y = 1;
        rtex.needsUpdate = true;
        refMat.map = rtex;
        refMat.opacity = 0.18;
        reflection.userData.baseOpacity = 0.18;
        refMat.needsUpdate = true;
        reflection.scale.set(w, spec.height, 1);
        pool.scale.set(w * 1.15, spec.height * 0.45 * (w / spec.height) + 0.45, 1);
      },
      undefined,
      () => {}
    );

    cast.add(fig);
  }

  return cast;
}

// Proximity fade. The camera flies THROUGH the gathering: at the closest
// approach a figure fills the frame edge and the crop leaves a fragment —
// a raised hand reads as a disembodied claw. Nobody is ever half a person
// here, so each figure dissolves as the camera arrives instead of being
// sliced by the frustum. Base opacities are captured once (they differ per
// layer: body 1, pool .35, reflection .18, backglow .55) and scaled together.
const FADE_GONE = 2.2; // world units: fully dissolved inside this radius
const FADE_FULL = 4.6; // ... and fully present beyond it

export function updateCast(cast: THREE.Group, camera: THREE.Camera): void {
  for (const fig of cast.children) {
    const d = fig.position.distanceTo(camera.position);
    // smoothstep(FADE_GONE -> FADE_FULL): no pop, no linear ramp edge
    const t = Math.min(1, Math.max(0, (d - FADE_GONE) / (FADE_FULL - FADE_GONE)));
    const k = t * t * (3 - 2 * t);
    for (const child of (fig as THREE.Group).children) {
      const mesh = child as THREE.Mesh;
      const mat = mesh.material as THREE.Material & { opacity: number };
      if (!mat) continue;
      // baseOpacity is authored at creation (and raised by the texture loader
      // for the body/reflection, which start at 0 to avoid a white-box flash);
      // never sampled from the live material, or a faded frame would stick.
      const base = (mesh.userData as { baseOpacity?: number }).baseOpacity;
      if (base === undefined) continue;
      mat.opacity = base * k;
    }
    fig.visible = k > 0.001;
  }
}
