document.addEventListener("DOMContentLoaded", function() {
  console.log("INDEX LOCKED AND LOADED");
});

class ThreeRenderer {
  constructor() {
    this.scene, this.camera, this.renderer;
    
    this.scene = new THREE.Scene();
    this.WIDTH = window.innerWidth;
    this.HEIGHT = window.innerHeight;
  }
}