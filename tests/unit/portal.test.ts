// @vitest-environment jsdom
// STRUCTURE-LEVEL tests only: jsdom has no WebGL, so we assert exported
// constants and object-graph shape, never rendered pixels. Pixels are
// QA'd by eye via tools/qa_shots.mjs (spec §8).
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { PORTAL_W, PORTAL_ASPECT, LEAN_DEG, createPortal } from '../../src/world/portal';

describe('portal constants (brand geometry law — never changes, only its light)', () => {
  it('exports the parallelogram constants verbatim from the prototype', () => {
    expect(PORTAL_W).toBe(2.5);
    expect(PORTAL_ASPECT).toBe(1.27);
    expect(LEAN_DEG).toBe(20);
  });
});

describe('createPortal (structure only)', () => {
  it('returns a group with exactly 2 children: the shader face and the halo', () => {
    const p = createPortal();
    expect(p.group).toBeInstanceOf(THREE.Group);
    expect(p.group.children).toHaveLength(2);
  });

  it('setDim drives the uDim uniform on the face material', () => {
    const p = createPortal();
    p.setDim(0.32);
    const face = p.group.children[0] as THREE.Mesh;
    const mat = face.material as THREE.ShaderMaterial;
    expect(mat.uniforms.uDim.value).toBeCloseTo(0.32);
  });

  it('halo is a radial-textured additive sprite — kill-class guard: bounded-plane halo', () => {
    const p = createPortal();
    const halo = p.group.children[1] as THREE.Mesh;
    const mat = halo.material as THREE.MeshBasicMaterial;
    expect(mat.map).toBeInstanceOf(THREE.CanvasTexture); // radial gradient texture, never a flat colour plane
    expect(mat.blending).toBe(THREE.AdditiveBlending);
    expect(mat.depthWrite).toBe(false);
    expect(mat.transparent).toBe(true);
  });
});
