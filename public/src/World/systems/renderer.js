import { WebGLRenderer } from 'three';

export function createRenderer() {
  const renderer = new WebGLRenderer({ antialias: true });

  renderer.physicallyCorrectLights = true;

  return renderer;
}


