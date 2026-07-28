import { createWorld } from '../src/world/scene';

const canvas = document.getElementById('gl') as HTMLCanvasElement;
const world = createWorld(canvas);

// prototype frame-0 pose
world.camera.position.set(0, 2.1, 8);
world.camera.lookAt(0, 1.8, -14);

function frame(t: number): void {
  const time = t * 0.001;
  world.portal.setTime(time);
  world.ribbon.setTime(time);
  world.dust.rotation.y = time * 0.012;
  world.composer.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

addEventListener('resize', () => world.setSize(innerWidth, innerHeight));
