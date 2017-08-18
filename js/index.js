// This is the function that's called when the page first loads
document.addEventListener("DOMContentLoaded", function() {
  console.log("INDEX LOCKED AND LOADED");
  
  // Create the render window here
  const threes = new ThreeRenderer();
  
  window.addEventListener('resize', function() { 
    threes.resize(window.innerWidth, window.innerHeight)
  });

  // Start the animation
  threes.animate();
});

// This class is responsible for rendering everything
class ThreeRenderer {
  constructor() {
    // bind animate so that it can call itself
    this.animate = this.animate.bind(this);

    this.scene = new THREE.Scene();
    var WIDTH = window.innerWidth,
        HEIGHT = window.innerHeight;

    // Create a this.renderer and add it to the DOM.
    this.renderer = new THREE.WebGLRenderer({antialias:true});
    this.renderer.setSize(WIDTH, HEIGHT);
    document.body.appendChild(this.renderer.domElement);

    // Create a this.camera, zoom it out from the model a bit, and add it to the this.scene.
    this.camera = new THREE.PerspectiveCamera(45, WIDTH / HEIGHT, 0.1, 20000);
    this.camera.position.set(0,6,0);
    this.scene.add(this.camera);

    // Set the background color of the this.scene.
    this.renderer.setClearColorHex(0x333F47, 1);

    // Create a light, set its position, and add it to the this.scene.
    var light = new THREE.PointLight(0xffffff);
    light.position.set(-100,200,100);
    this.scene.add(light);

    // Load in the mesh and add it to the this.scene.
    var loader = new THREE.JSONLoader();
    loader.load( "models/treehouse_logo.js", (geometry) => {
      var material = new THREE.MeshLambertMaterial({color: 0x55B663});
      let mesh = new THREE.Mesh(geometry, material);
      this.scene.add(mesh);
    });

    // Add OrbitControls so that we can pan around with the mouse.
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
  }

  resize(width, height) {
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }


  // Renders the this.scene and updates the render as needed.
  animate() {
    // Huzzah for functional programming.
    // Note that animate's context is bound to this in the constructor
    requestAnimationFrame(this.animate);
    
    // Render the this.scene.
    this.renderer.render(this.scene, this.camera);
    this.controls.update();
  }
}

