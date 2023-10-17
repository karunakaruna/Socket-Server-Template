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
