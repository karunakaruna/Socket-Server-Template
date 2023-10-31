
import * as THREE from 'three';

import { loadBirds } from './components/birds/birds.js';
import { createCamera } from './components/camera.js';
import { createLights } from './components/lights.js';
import { createScene } from './components/scene.js';

import { createControls } from './systems/controls.js';
import { createRenderer } from './systems/renderer.js';
import { Resizer } from './systems/Resizer.js';
import { Loop } from './systems/Loop.js';

let camera;
let renderer;
let scene;
let loop;

class World {
  constructor(container) {
    camera = createCamera();
    renderer = createRenderer();
    scene = createScene();
    loop = new Loop(camera, scene, renderer);
    container.append(renderer.domElement);

    const controls = createControls(camera, renderer.domElement);
    const { ambientLight, mainLight } = createLights();

    loop.updatables.push(controls);
    scene.add(ambientLight, mainLight);

    // Create a cube
    const geometry = new THREE.BoxGeometry(1, 1, 1);

    // Create a material
    const material = new THREE.MeshPhongMaterial({ color: 0x005500 });

    // Add the cube to the geometry
    const cube = new THREE.Mesh(geometry, material);

    // Add the cube to the scene
    scene.add(cube);




    const resizer = new Resizer(container, camera, renderer);
  }

  async init(){

    await loadBirds();

  }

  render() {
    renderer.render(scene, camera);
  }

  start() {
    loop.start();
  }

  stop() {
    loop.stop();
  }
}

export { World };
