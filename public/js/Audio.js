// Audio ///
import { scene } from '../scene.js';

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let audioBuffer; // Store the audio buffer globally

// Load the audio file and store it in the audioBuffer
const audioFiles = {
    'chime': 'audio/multichime2.mp3',
    'beacon': 'audio/636631__eponn__soft-buildup-game-fx-3.mp3',
    'click': 'audio/420997__eponn__click.mp3',
    'beep': 'audio/528863__eponn__beep-3.mp3',
    // ...add other sounds as needed
};
export const listener = new THREE.AudioListener();
const loop = new THREE.PositionalAudio( listener );

// load a sound and set it as the Audio object's buffer
const loopLoader = new THREE.AudioLoader();
loopLoader.load( 'audio/Precession - bnk736_1.mp3', function( buffer ) {
    loop.setBuffer( buffer );
    loop.setLoop(true);
    loop.setVolume(2);
    loop.play();
});


let audioBuffers = {};

for (let soundName in audioFiles) {
    fetch(audioFiles[soundName])
      .then(response => response.arrayBuffer())
      .then(data => audioContext.decodeAudioData(data))
      .then(buffer => {
          audioBuffers[soundName] = buffer; // Store the audio buffer with its key
      })
      .catch(error => console.error(`Error loading ${soundName} audio:`, error));
}

export function playSpatialAudio(soundName, position, volume = 1) {
    const buffer = audioBuffers[soundName];
    if (!buffer) {
        console.error(`Audio buffer for "${soundName}" not found.`);
        return;
    }
    
    const sound = new THREE.PositionalAudio(listener);
    
    sound.setBuffer(buffer);
    sound.setRefDistance(1);
    sound.setRolloffFactor(1);
    sound.setDistanceModel('exponential');
    sound.setMaxDistance(1000);
    sound.setVolume(volume);
    sound.position.copy(position);
    scene.add(sound);
    
    sound.play();

    sound.onEnded = function() {
        scene.remove(sound);
    };
}
