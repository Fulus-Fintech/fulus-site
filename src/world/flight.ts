import * as THREE from 'three';
import type { WorldHandles } from './scene'; // type-only: erased at runtime, keeps node-env tests WebGL-free
import { beatStates, type BeatUI } from '../ui/beats';
import { updateCast } from './cast';

// The 8 approved camera path points, verbatim from the prototype.
export const CAM_POINTS: [number, number, number][] = [
  [0, 2.1, 8],
  [-0.9, 1.9, 3.5],
  [0.9, 1.7, -2],
  [-0.6, 1.5, -7],
  [0, 1.5, -11.5],
  [0.15, 1.6, -14.2],
  [0, 1.7, -18.5],
  [0, 1.75, -22],
];

export const PLANE_Z = -14;      // the portal plane
export const CROSS_RANGE = 3.2;  // k reaches 1 this far past the plane
// G2 QA round 3 (kill-class: blown crossing frame): prototype sigma 0.55 held
// the wash at ~0.49 opacity at the settled 0.72 stop (z≈-13.39) — a pale-cyan
// flood with zero night values. The wash is the crossing's breath (spec §
// "peaks exactly at portal z … falls away within a breath"): it must hug the
// plane. 0.24 keeps the full 0.92 flash at the crossing itself and returns
// the approach frames to night (<0.05 at the QA stop).
export const WASH_SIGMA = 0.24;  // Gaussian sigma of the crossing wash
export const WASH_MAX = 0.92;    // wash peak opacity
export const LERP = 0.07;        // approved scroll feel
export const APPROACH_RANGE = 2.5; // door-yield ramp: starts this far from the plane
// G2 QA round 3: at 0.7 the full-frustum face still rendered a pale field
// (attribution shots: the portal face alone reproduced the 0.72 whiteout with
// wash and backglows both disabled). The ramp now sheds the face's PRESENCE
// (alpha, portal.setYield) rather than only its color, so the night world
// behind the door carries the threshold frames; 0.96 leaves a soft ghost of
// the face right at the plane, under the wash flash.
export const APPROACH_DIM = 0.96;  // fraction of the door's presence shed right at the plane

// prototype: clamp((-cz - 14) / 3.2, 0, 1) === clamp((PLANE_Z - camZ) / CROSS_RANGE, 0, 1)
export function crossingK(camZ: number): number {
  return THREE.MathUtils.clamp((PLANE_Z - camZ) / CROSS_RANGE, 0, 1);
}

// The door yields as you reach it: 0 far away, 1 exactly at the plane,
// symmetric on both sides. G2 QA law (kill-class: blown bloom cores): the
// prototype only dimmed the portal AFTER crossing (k > 0), so on approach the
// face fills the whole frustum at full HDR brightness and bloom blows the
// frame to a white field. This ramp dims the door exactly while it swallows
// the frame, keeping the through-the-door moment bright but textured; past
// the plane it hands off to the k-based inside dim as it fades back out.
// G2 QA round 3: ease-out shaped — the yield LEADS the transit. The face
// dominates the frame from about half range in, so most of the dimming must
// land in the first half of the approach (a linear/smoothstep ramp lagged and
// left a bloom-blown core mid-transit at z≈-12.8). Still symmetric.
export function doorProximity(camZ: number): number {
  const t = THREE.MathUtils.clamp(1 - Math.abs(camZ - PLANE_Z) / APPROACH_RANGE, 0, 1);
  return 1 - (1 - t) * (1 - t);
}

// How open the way ahead is: 0 until the door is within APPROACH_RANGE, 1 from
// the plane onward. G3 QA (kill-class: an empty frame at the threshold) — the
// beyond used to ride on crossingK alone, which is still 0 at z ≈ -13.4 where
// the door has already yielded 99% of its presence. That left the 0.72 stop
// with neither door nor light in it, just fog. The beyond IS what shows through
// the opening, so it rises over the same window the door yields over, and never
// falls back once you are through.
export function wayOpen(camZ: number): number {
  return THREE.MathUtils.clamp((PLANE_Z + APPROACH_RANGE - camZ) / APPROACH_RANGE, 0, 1);
}

// prototype: exp(-(cz + 14)^2 / (2 * .55^2)) * .92 — peaks exactly at the plane
export function washOpacity(camZ: number): number {
  return Math.exp(-Math.pow(camZ - PLANE_Z, 2) / (2 * WASH_SIGMA * WASH_SIGMA)) * WASH_MAX;
}

export function createFlight(world: WorldHandles, ui: BeatUI): { frame(tMs: number): void; dispose(): void } {
  const camPath = new THREE.CatmullRomCurve3(CAM_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  const fog = world.scene.fog as THREE.FogExp2;
  const sky = world.scene.background as THREE.Color;
  const look = new THREE.Vector3();

  let prog = 0;
  let target = 0;
  let mx = 0;
  let my = 0;

  const onScroll = (): void => {
    target = window.scrollY / (document.body.scrollHeight - window.innerHeight);
  };
  const onPointer = (e: PointerEvent): void => {
    mx = e.clientX / window.innerWidth - 0.5;
    my = e.clientY / window.innerHeight - 0.5;
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('pointermove', onPointer, { passive: true });
  onScroll(); // honour a mid-page reload

  return {
    frame(tMs: number): void {
      const time = tMs * 0.001;
      prog += (target - prog) * LERP;

      world.portal.setTime(time);
      world.ribbon.setTime(time);
      world.env.setTime(tMs * 0.001);
      world.dust.rotation.y = time * 0.012;

      const p = camPath.getPointAt(Math.min(0.999, Math.max(0, prog)));
      world.camera.position.set(p.x + mx * 0.8, p.y - my * 0.5, p.z);

      // the gathering dissolves as the camera arrives among them — a figure
      // sliced by the frame edge reads as a fragment, never as a person
      updateCast(world.cast, world.camera);

      // crossing: k rises 0->1 as the camera passes the plane at z=-14
      const k = crossingK(p.z);
      look.set(0, 1.35 + (1 - prog) * 0.45 + k * 0.5, -14 - k * 18);
      world.camera.lookAt(look);

      // the wash peaks exactly at the plane
      ui.setWash(washOpacity(p.z));

      // the door yields on approach (see doorProximity), and the legibility
      // scrim steps aside with it — a dark screen-space ellipse over a bright
      // full-frame door reads as an untextured gray blob (G2 QA kill-class).
      // G3 QA round 1: the same blob came back on the far side. Past the plane
      // the light beyond fills the frame, and the scrim's ellipse sat over the
      // brightest, deepest moment of the film — the reviewer read the centre as
      // "a grey smudge occluding frame center rather than luminous depth"
      // (measured neutral R58 G80 B88 inside a teal R31 G98 B108 field). It
      // steps aside with the crossing too. Nothing is lost: the walk-in copy
      // rides the near-black water at the bottom of the frame, where this
      // 55%×45% centre ellipse has already fallen to zero.
      const near = doorProximity(p.z);
      ui.setScrim(Math.min(1 - near, 1 - k));

      // inside: calmer, dimmer door behind you, light ahead. The near ramp
      // yields the face's presence (alpha); the k dim keeps carrying the
      // calmer-door-behind-you look after the crossing. Squared falloff: any
      // residual of the full-frustum face flattens the night, so the door must
      // be effectively OPEN (transparent) by the time it swallows the frame.
      world.portal.setDim(1 - k * 0.68);
      world.portal.setYield(1 - (1 - near * APPROACH_DIM) ** 2);
      const night = k > 0.01 ? 0x05202b : 0x020b18;
      fog.color.setHex(night);
      fog.density = 0.052 - k * 0.012;
      const open = wayOpen(p.z); // the beyond rises with the door's yield (see wayOpen)
      world.beyond.material.opacity = open * 0.6;
      world.beyondRef.material.opacity = open * 0.3;
      world.veil.material.color.setHex(night); // QA LAW: veil colour follows fog colour
      // ...and so does the sky. The mirror's far field fogs to fog.color while
      // the sky above it stays scene.background: when the two drift apart the
      // water's far edge draws a hard line across the full frame (G3 QA at
      // 0.97: a 1px step at y ≈ 466 — the horizon-seam kill-class).
      sky.setHex(night);
      world.veil.material.opacity = 0.58 - k * 0.06;
      world.bloom.strength = (0.85 + prog * 0.35) * (1 - k * 0.35);

      // the ribbon fades out before arrival so nothing slices the frame
      world.ribbon.setFade(1 - THREE.MathUtils.smoothstep(prog, 0.5, 0.72));

      ui.setMeter(prog);
      ui.setBeats(beatStates(prog, k));

      world.composer.render();
    },
    dispose(): void {
      removeEventListener('scroll', onScroll);
      removeEventListener('pointermove', onPointer);
    },
  };
}
