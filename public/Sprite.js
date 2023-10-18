export function createLabelSprite(text) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = '20px Arial';
    const textMetrics = context.measureText(text);
    
    canvas.width = textMetrics.width + 10;
    canvas.height = 40;
    context.font = '20px Arial';
    context.fillStyle = 'white';
    context.fillText(text, 5, 15);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);

    const uniformScale = canvas.width / 35;
    sprite.scale.set(uniformScale, uniformScale * (canvas.height / canvas.width), 1);

    sprite.center.set(0.5, 0.5);
    return sprite;
}
import {sprites} from './Loaders.js';

export function attachLabelToObjects(parent, text) {
    const labelText = text;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = '15px Arial';
    const textMetrics = context.measureText(labelText);

    canvas.width = textMetrics.width + 10;
    canvas.height = 40;
    context.font = '15px Arial';
    context.fillStyle = 'red';
    context.fillText(labelText, 5, 30);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);

    sprite.position.y = 2;

    const uniformScale = canvas.width / 35;
    sprite.scale.set(uniformScale, uniformScale * (canvas.height / canvas.width), 1);
    sprite.center.set(0.5, 0.5);

    parent.add(sprite);
    //sprites.push(sprite);
   // return sprite;
}
