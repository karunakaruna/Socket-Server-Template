import { World } from './World/World.js';

async function main() {
  // Get a reference to the container element
  const container = document.querySelector('#scene-container');

  // create a button element
  const button = document.createElement('button');
  button.textContent = 'Switch';

  // attach the button to the container
  container.appendChild(button);

  // create a new world
  const world = new World(container);

  // start the animation loop
  world.start();
  world.init();

  // add event listener to the button
  button.addEventListener('click', () => {
    world.switch();
  });
}

main().catch((err) => {
  console.error(err);
});