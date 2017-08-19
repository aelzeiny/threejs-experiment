// This is the function that's called when the page first loads
document.addEventListener("DOMContentLoaded", function() {
  console.log("INDEX LOCKED AND LOADED");
  
  // Create the render window here
  // Hey Cyril, to increase the fisheye effect:
  // (1) Go to this demo page: http://www.decarpentier.nl/downloads/lensdistortion-webgl/lensdistortion-webgl.html
  // (2) Plug the numbers in order: horizontalFOV, strength, cylindricalRatio
  const threes = new ThreeRenderer(140, 1, 0.25);
  
  window.addEventListener('resize', function() { 
    threes.resize(window.innerWidth, window.innerHeight)
  });

  // Start the animation
  threes.animate();
});

// This class is responsible for rendering everything
// FishEYE Source: https://stackoverflow.com/questions/13360625/
class ThreeRenderer {
  constructor(horizontalFOV, strength, cylindricalRatio) {
    // bind animate function so that it can call itself
    this.animate = this.animate.bind(this);

    this.scene = new THREE.Scene();
    var WIDTH = window.innerWidth,
        HEIGHT = window.innerHeight;

    // Create a this.renderer and add it to the DOM.
    this.renderer = new THREE.WebGLRenderer({antialias:true});
    this.renderer.setSize(WIDTH, HEIGHT);
    document.body.appendChild(this.renderer.domElement);

    // Create a this.camera, zoom it out from the model a bit, and add it to the this.scene.
    this.camera = new THREE.PerspectiveCamera/*(45, WIDTH / HEIGHT, 0.1, 20000);*/( 100, window.innerWidth / window.innerHeight, 1, 1000000 );
    this.camera.position.z = 30;
    this.camera.position.y = 30;

    console.log(this.renderer);

    // Create effect composer
    let composer = new THREE.EffectComposer(this.renderer);
    composer.addPass(new THREE.RenderPass(this.scene, this.camera) );

    let effect = new THREE.ShaderPass(getDistortionShaderDefinition());
    composer.addPass(effect);
    effect.renderToScreen = true;

    // Setup distortion effect
    var height = Math.tan(THREE.Math.degToRad(horizontalFOV) / 2) / this.camera.aspect;

    this.camera.fov = Math.atan(height) * 2 * 180 / 3.1415926535;
    this.camera.updateProjectionMatrix();

    effect.uniforms["strength"].value = strength;
    effect.uniforms["height"].value = height;
    effect.uniforms["aspectRatio"].value = this.camera.aspect;
    effect.uniforms["cylindricalRatio"].value = cylindricalRatio;

    // Set the background color of the this.scene.
    this.renderer.setClearColor(0x333F47, 1);

    // Create a light, set its position, and add it to the this.scene.
    var light = new THREE.PointLight(0xffffff);
    light.position.set(-100,200,100);
    this.scene.add(light);

    // Load in the mesh and add it to the this.scene.
    var loader = new THREE.JSONLoader();
    loader.load( "models/m4.js", (geometry) => {
      var material = new THREE.MeshLambertMaterial({color: 0x999999});
      let mesh = new THREE.Mesh(geometry, material);
      this.scene.add(mesh);
    });

    // Add OrbitControls so that we can pan around with the mouse.
    this.scene.add(this.camera);
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
  }

  resize(width, height) {
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }


  // Renders the this.scene and updates the render as needed.
  animate() {
    requestAnimationFrame(this.animate);
    
    // Render the this.scene.
    this.renderer.render(this.scene, this.camera);
    this.controls.update();
  }
}

function getDistortionShaderDefinition() {
    return {

        uniforms: {
            "tDiffuse":         { type: "t", value: null },
            "strength":         { type: "f", value: 0 },
            "height":           { type: "f", value: 1 },
            "aspectRatio":      { type: "f", value: 1 },
            "cylindricalRatio": { type: "f", value: 1 }
        },

        vertexShader: [
            "uniform float strength;",          // s: 0 = perspective, 1 = stereographic
            "uniform float height;",            // h: tan(verticalFOVInRadians / 2)
            "uniform float aspectRatio;",       // a: screenWidth / screenHeight
            "uniform float cylindricalRatio;",  // c: cylindrical distortion ratio. 1 = spherical

            "varying vec3 vUV;",                // output to interpolate over screen
            "varying vec2 vUVDot;",             // output to interpolate over screen

            "void main() {",
                "gl_Position = projectionMatrix * (modelViewMatrix * vec4(position, 1.0));",

                "float scaledHeight = strength * height;",
                "float cylAspectRatio = aspectRatio * cylindricalRatio;",
                "float aspectDiagSq = aspectRatio * aspectRatio + 1.0;",
                "float diagSq = scaledHeight * scaledHeight * aspectDiagSq;",
                "vec2 signedUV = (2.0 * uv + vec2(-1.0, -1.0));",

                "float z = 0.5 * sqrt(diagSq + 1.0) + 0.5;",
                "float ny = (z - 1.0) / (cylAspectRatio * cylAspectRatio + 1.0);",

                "vUVDot = sqrt(ny) * vec2(cylAspectRatio, 1.0) * signedUV;",
                "vUV = vec3(0.5, 0.5, 1.0) * z + vec3(-0.5, -0.5, 0.0);",
                "vUV.xy += uv;",
            "}"
        ].join("\n"),

        fragmentShader: [
            "uniform sampler2D tDiffuse;",      // sampler of rendered scene?s render target
            "varying vec3 vUV;",                // interpolated vertex output data
            "varying vec2 vUVDot;",             // interpolated vertex output data

            "void main() {",
                "vec3 uv = dot(vUVDot, vUVDot) * vec3(-0.5, -0.5, -1.0) + vUV;",
                "gl_FragColor = texture2DProj(tDiffuse, uv);",
            "}"
        ].join("\n")

    };
}