

    export class Resizer {
        constructor(camera, renderer) {
            this.camera = camera;
            this.renderer = renderer;
            window.addEventListener('resize', this.onWindowResize.bind(this), false);
        }

        onWindowResize() {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            //labelRenderer.setSize( window.innerWidth, window.innerHeight );
        }
    }


