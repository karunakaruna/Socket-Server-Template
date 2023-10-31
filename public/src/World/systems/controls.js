import { OrbitControls } from 'https://unpkg.com/three/examples/jsm/controls/OrbitControls.js';

export function createControls(camera, canvas) {
  const controls = new OrbitControls(camera, canvas);

  controls.enableDamping = true;

  // forward controls.update to our custom .tick method
  controls.tick = () => controls.update();

  return controls;
}


