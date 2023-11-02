export function initGrid(){
const gridGeometry = new THREE.PlaneGeometry(188, 188, 88, 88);
const gridMaterial = new THREE.MeshBasicMaterial({ color: 0x333333, wireframe: true });
const grid = new THREE.Mesh(gridGeometry, gridMaterial);
grid.rotation.x = Math.PI / 2;
return grid;
};