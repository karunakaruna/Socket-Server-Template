
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
let controls;
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
    controls = createControls(camera, renderer.domElement);

    const { ambientLight, mainLight } = createLights();

    loop.updatables.push(controls);
    scene.add(ambientLight, mainLight);

    // // Create a cube
    // const geometry = new THREE.BoxGeometry(1, 1, 1);

    // // Create a material
    // const material = new THREE.MeshPhongMaterial({ color: 0x005500 });

    // // Add the cube to the geometry
    // const cube = new THREE.Mesh(geometry, material);

    // // Add the cube to the scene
    // scene.add(cube);
    this.birds = {
      parrot: null,
      flamingo: null,
      stork: null
    };



    const resizer = new Resizer(container, camera, renderer);
  }

  async init(){

    const birds = await loadBirds();
    this.birds.parrot = birds.parrot;
    this.birds.flamingo = birds.flamingo;
    this.birds.stork = birds.stork;

    scene.add(this.birds.parrot, this.birds.flamingo, this.birds.stork);
    controls.target.copy(this.birds.flamingo.position);
  }

  switch(){
    const birdsArray = [this.birds.parrot, this.birds.flamingo, this.birds.stork];
    const currentBird = birdsArray.find(bird => bird.position.equals(controls.target));
    const nextBird = birdsArray[(birdsArray.indexOf(currentBird) + 1) % birdsArray.length];
    controls.target.copy(nextBird.position);
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
