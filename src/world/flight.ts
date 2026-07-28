import * as THREE from 'three';
import type { WorldHandles } from './scene'; // type-only: erased at runtime, keeps node-env tests WebGL-free
import { beatStates, type BeatUI } from '../ui/beats';

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
export const WASH_SIGMA = 0.55;  // Gaussian sigma of the crossing wash
export const WASH_MAX = 0.92;    // wash peak opacity
export const LERP = 0.07;        // approved scroll feel

// prototype: clamp((-cz - 14) / 3.2, 0, 1) === clamp((PLANE_Z - camZ) / CROSS_RANGE, 0, 1)
export function crossingK(camZ: number): number {
  return THREE.MathUtils.clamp((PLANE_Z - camZ) / CROSS_RANGE, 0, 1);
}

// prototype: exp(-(cz + 14)^2 / (2 * .55^2)) * .92 — peaks exactly at the plane
export function washOpacity(camZ: number): number {
  return Math.exp(-Math.pow(camZ - PLANE_Z, 2) / (2 * WASH_SIGMA * WASH_SIGMA)) * WASH_MAX;
}

export function createFlight(world: WorldHandles, ui: BeatUI): { frame(tMs: number): void; dispose(): void } {
  const camPath = new THREE.CatmullRomCurve3(CAM_POINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  const fog = world.scene.fog as THREE.FogExp2;
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
      world.dust.rotation.y = time * 0.012;

      const p = camPath.getPointAt(Math.min(0.999, Math.max(0, prog)));
      world.camera.position.set(p.x + mx * 0.8, p.y - my * 0.5, p.z);

      // crossing: k rises 0->1 as the camera passes the plane at z=-14
      const k = crossingK(p.z);
      look.set(0, 1.35 + (1 - prog) * 0.45 + k * 0.5, -14 - k * 18);
      world.camera.lookAt(look);

      // the wash peaks exactly at the plane
      ui.setWash(washOpacity(p.z));

      // inside: calmer, dimmer door behind you, light ahead
      world.portal.setDim(1 - k * 0.68);
      fog.color.setHex(k > 0.01 ? 0x05202b : 0x020b18);
      fog.density = 0.052 - k * 0.012;
      world.beyond.material.opacity = k * 0.6;
      world.beyondRef.material.opacity = k * 0.3;
      world.veil.material.color.setHex(k > 0.01 ? 0x05202b : 0x020b18); // QA LAW: veil colour follows fog colour
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
