import { createWorld } from '../src/world/scene';
import { createFlight } from '../src/world/flight';
import { createBeatUI } from '../src/ui/beats';

const canvas = document.getElementById('gl') as HTMLCanvasElement;
const world = createWorld(canvas);
const flight = createFlight(world, createBeatUI());
// dev-only QA instrumentation: lets the shot harness toggle layers for attribution
(window as unknown as Record<string, unknown>).__world = world;

function loop(t: number): void {
  flight.frame(t);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

addEventListener('resize', () => world.setSize(innerWidth, innerHeight));
