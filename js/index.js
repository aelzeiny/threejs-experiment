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

// Hey Cyril, to increase the fisheye effect:
// (1) Go to this demo page: http://www.decarpentier.nl/downloads/lensdistortion-webgl/lensdistortion-webgl.html
// (2) Plug the numbers in order: HORIZONTAL_FOV, strength, cylindricalRatio
const HORIZONTAL_FOV = 140;
const STRENGTH = 0.5;//1;
const CYLINDRICAL_RATIO = 2;//0.25;

const GRID_SPACING = 100;
const CAMERA_DISTANCE = 1000; // camera distance from axis
const FAR = 1000000; // furthest cross layer
const LAYERS = 3; // number of cross layers

// This class is responsible for rendering everything
// FishEYE Source: https://stackoverflow.com/questions/13360625/
class ThreeRenderer {
  constructor() {
    // bind animate function so that it can call itself
    this.animate = this.animate.bind(this);

    this.scene = new THREE.Scene();
    var WIDTH = window.innerWidth - 10,
        HEIGHT = window.innerHeight - 50;

    // Create a this.renderer and add it to the DOM.
    this.renderer = new THREE.WebGLRenderer({antialias:true});
    this.renderer.setSize(WIDTH, HEIGHT);
    document.body.appendChild(this.renderer.domElement);

    // Create a this.camera, zoom it out from the model a bit, and add it to the this.scene.
    this.camera = new THREE.PerspectiveCamera( 100, WIDTH / HEIGHT, 1, FAR );
        
    this.camera.position.set(0, CAMERA_DISTANCE, 0);
    this.camera.up = new THREE.Vector3(0,0,-1);
    this.camera.lookAt(new THREE.Vector3(0,0,0));

    console.log(this.renderer);

    // Create effect composer
    let composer = new THREE.EffectComposer(this.renderer);
    composer.addPass(new THREE.RenderPass(this.scene, this.camera) );

    let effect = new THREE.ShaderPass(getDistortionShaderDefinition());
    composer.addPass(effect);
    effect.renderToScreen = true;

    // Setup distortion effect
    var height = Math.tan(THREE.Math.degToRad(HORIZONTAL_FOV) / 2) / this.camera.aspect;

    this.camera.fov = Math.atan(height) * 2 * 180 / 3.1415926535;
    this.camera.updateProjectionMatrix();

    effect.uniforms["strength"].value = STRENGTH;
    effect.uniforms["height"].value = height;
    effect.uniforms["aspectRatio"].value = this.camera.aspect;
    effect.uniforms["cylindricalRatio"].value = CYLINDRICAL_RATIO;

    // Set the background color of the this.scene.
    this.renderer.setClearColor(0x333F47, 1);

    // Create a light, set its position, and add it to the this.scene.
    var light = new THREE.PointLight(0xffffff);
    light.position.set(-100,200,100);
    this.scene.add(light);

    // var ambiColor = "#999999";
    // var ambientLight = new THREE.AmbientLight(ambiColor);
    // this.scene.add(ambientLight);

    // Load in the mesh and add it to the this.scene.
    
    let material = new THREE.MeshLambertMaterial({color: 0x999999});
    var loader = new THREE.JSONLoader();
    loader.load( "models/plus_v3.js", (geometry) => {
        this.loadArrows(geometry, material);
    });
    
    // Add OrbitControls so that we can pan around with the mouse.
    this.scene.add(this.camera);
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
  }

  loadArrows(geometry, material) {
    var vFOV = this.camera.fov * Math.PI / 180;        // convert vertical fov to radians
    var height = 2 * Math.tan( vFOV / 2 ) * dist; // visible height
    for(let x=0;x<10;x++) {
        for(let z=0;z<10;z++) {
            let mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(x * GRID_SPACING, 0 , z * GRID_SPACING);
            mesh.add(new THREE.AxisHelper(10));
            this.scene.add(mesh);
        }
    }
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


// Just a distorition shader for the fisheye effect.
// FishEYE Source: https://stackoverflow.com/questions/13360625/
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