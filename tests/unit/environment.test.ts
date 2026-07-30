// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createEnvironment, gradeMotes } from '../../src/world/environment';

describe('createEnvironment', () => {
  it('exposes the three sheddable richness flags, all on by default', () => {
    const env = createEnvironment();
    expect(env.grain.enabled).toBe(true);
    expect(env.ripple.mesh.visible).toBe(true);
    expect(env.shafts.visible).toBe(true);
  });

  it('ripple lies flat just above the mirror; shafts carry opacity .12', () => {
    const env = createEnvironment();
    expect(env.ripple.mesh.rotation.x).toBeCloseTo(-Math.PI / 2);
    expect(env.ripple.mesh.position.y).toBeCloseTo(0.02);
    expect((env.shafts.material as { opacity: number }).opacity).toBeCloseTo(0.12);
  });

  it('the grade/grain pass never touches colour space — it runs in linear, before the bloom (G3 QA)', () => {
    // A raw ShaderMaterial does no linear->sRGB encode, so this pass must never
    // end the chain (see the order guard in scene.test.ts). Encoding here as
    // well would double-convert once the bloom composites behind it.
    const env = createEnvironment();
    expect(env.grain.material.fragmentShader).not.toContain('colorspace_fragment');
  });

  it('ripple crests dissolve with view distance — procedural noise has no mipmaps to alias into', () => {
    const env = createEnvironment();
    const mat = env.ripple.mesh.material as THREE.ShaderMaterial;
    expect(mat.vertexShader).toContain('vDepth');
    expect(mat.fragmentShader).toContain('smoothstep(6., 19., vDepth)');
  });

  it('the shaft texture falls off on ALL sides — no side edge, no far edge (bounded-plane kill-class)', () => {
    const env = createEnvironment();
    const map = (env.shafts.material as THREE.MeshBasicMaterial).map as THREE.CanvasTexture;
    // a 4px-wide strip can only carry a gradient along v; the across-falloff
    // needs real width (the sides used to cut hard through the cast's reflections)
    expect((map.image as HTMLCanvasElement).width).toBeGreaterThanOrEqual(32);
  });

  it('setTime drives both time uniforms', () => {
    const env = createEnvironment();
    env.setTime(3.5);
    const rippleMat = env.ripple.mesh.material as unknown as { uniforms: { uTime: { value: number } } };
    expect(rippleMat.uniforms.uTime.value).toBe(3.5);
    expect(env.grain.uniforms.uTime.value).toBe(3.5);
  });
});

describe('gradeMotes', () => {
  it('writes per-mote sizes graded by depth — near larger than far', () => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 8, 0, 0, -36]), 3));
    const dust = new THREE.Points(geo, new THREE.PointsMaterial());
    gradeMotes(dust);
    const sizes = geo.getAttribute('aSize');
    expect(sizes.count).toBe(2);
    expect(sizes.getX(0)).toBeGreaterThan(sizes.getX(1)); // the near mote outweighs the far one
    expect(dust.material).toBeInstanceOf(THREE.ShaderMaterial);
  });
});
