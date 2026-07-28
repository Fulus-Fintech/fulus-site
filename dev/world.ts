import { createWorld } from '../src/world/scene';
import { createFlight } from '../src/world/flight';
import { createBeatUI } from '../src/ui/beats';

const canvas = document.getElementById('gl') as HTMLCanvasElement;
const world = createWorld(canvas);
const flight = createFlight(world, createBeatUI());

function loop(t: number): void {
  flight.frame(t);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

addEventListener('resize', () => world.setSize(innerWidth, innerHeight));
