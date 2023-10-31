import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three/examples/jsm/loaders/GLTFLoader.js';

export async function loadBirds(){
const loader = new GLTFLoader();

const parrotData = await loader.loadAsync('/assets/models/Parrot.glb');

console.log( 'Squaaaaawk!', parrotData);

}
