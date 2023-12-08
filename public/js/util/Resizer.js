

    export class Resizer {
        constructor(camera, renderer, composer) {
            this.camera = camera;
            this.renderer = renderer;
            this.composer = composer; // Add this line

            window.addEventListener('resize', this.onWindowResize.bind(this), false);
        }

        onWindowResize() {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.composer.setSize(window.innerWidth, window.innerHeight); // Add this line

            //labelRenderer.setSize( window.innerWidth, window.innerHeight );
        }
    }


