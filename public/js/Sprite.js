//Sprite.js

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
    context.font = '30px Arial';
    const textMetrics = context.measureText(labelText);

    canvas.width = textMetrics.width + 10;
    canvas.height = 40;
    context.font = '30px Arial';
    context.fillStyle = 'red';
    context.fillText(labelText, 5, 30);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);

    sprite.position.y = 1;

    const uniformScale = canvas.width / 100;
    sprite.scale.set(uniformScale, uniformScale * (canvas.height / canvas.width), 1);
    sprite.center.set(0.5, 0.5);

    parent.add(sprite);
    //sprites.push(sprite);
   // return sprite;
}

// export function attachLabelToObjectsAdv(parent, text, offsetx = 0, offsety = 1, offsetz = 0) {
//     const labelText = text;
//     const canvas = document.createElement('canvas');
//     const context = canvas.getContext('2d');
//     context.font = '30px Arial';
//     const textMetrics = context.measureText(labelText);

//     canvas.width = textMetrics.width + 10;
//     canvas.height = 40;
//     context.font = '30px Arial';
//     context.fillStyle = 'red';
//     context.fillText(labelText, 5, 30);

//     const texture = new THREE.CanvasTexture(canvas);
//     const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
//     const sprite = new THREE.Sprite(spriteMaterial);

//     sprite.position.x += offsetx;
//     sprite.position.y += offsety;
//     sprite.position.z += offsetz;

//     const uniformScale = canvas.width / 100;
//     sprite.scale.set(uniformScale, uniformScale * (canvas.height / canvas.width), 1);
//     sprite.center.set(0.5, 0.5);

//     parent.add(sprite);
//     //sprites.push(sprite);
//    // return sprite;
// }

export function attachLabelToObjectsAdv(parent, text, offsetx = 0, offsety = 1, offsetz = 0) {
    let sprite = parent.labelSprite;

    // Create a canvas and context
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = '30px Arial';
    const textMetrics = context.measureText(text);

    // Set canvas size
    canvas.width = textMetrics.width + 10;
    canvas.height = 40;
    context.font = '30px Arial';
    context.fillStyle = 'red';
    context.fillText(text, 5, 30);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);

    // If the sprite doesn't exist, create it
    if (!sprite) {
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        sprite = new THREE.Sprite(spriteMaterial);
        sprite.center.set(0.5, 0.5);
        parent.add(sprite);
        parent.labelSprite = sprite; // Store reference for future updates
    } else {
        // Update the existing sprite's material
        sprite.material.map.dispose(); // Dispose of the old texture
        sprite.material.map = texture;
        sprite.material.needsUpdate = true;
    }

    // Set position and scale
    sprite.position.set(offsetx, offsety, offsetz);
    const uniformScale = canvas.width / 100;
    sprite.scale.set(uniformScale, uniformScale * (canvas.height / canvas.width), 1);
}

