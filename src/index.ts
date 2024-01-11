// From: https://sbcode.net/threejs/threejs-typescript-boilerplate/

import * as THREE from 'three'

import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GroundProjectedSkybox } from 'three/examples/jsm/objects/GroundProjectedSkybox.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { LumaSplatsThree, LumaSplatsSemantics } from "@lumaai/luma-web";

const guiParams = {
  height: 12.5,
  radius: 360,
  xRot: 0,
  yRot: 72,
  zRot: 0,
};

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let skybox: GroundProjectedSkybox
let nightriderSplat: LumaSplatsThree
let cube: THREE.Mesh

const clock = new THREE.Clock();
type UniformTypeGLSL = 'float' | 'int' | 'bool' | 'vec2' | 'vec3' | 'vec4' | 'mat2' | 'mat3' | 'mat4' | 'sampler2D';
const uniformTime = { value: clock.getElapsedTime() };
let cubeGoingUp = true

const SHOW_GUI = true

const init = async () => {
  // scene
  scene = new THREE.Scene()
  // camera
  camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
  )
  camera.position.x = 0.005
  camera.position.z = 0.001
  // renderer
  renderer = new THREE.WebGLRenderer({ antialias: false })
  // renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setPixelRatio(0.8)
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  document.body.appendChild(renderer.domElement)
  // controls
  const controls = new OrbitControls( camera, renderer.domElement );
  controls.addEventListener( 'change', render );
  controls.target.set( 0, 2, 0 );
  controls.maxPolarAngle = THREE.MathUtils.degToRad( 90 ); // ground
  controls.minPolarAngle = THREE.MathUtils.degToRad( 15 ); // sky
  controls.maxDistance = 12;
  controls.minDistance = 1;
  controls.enablePan = false;
  controls.update();
  // gui
  if (SHOW_GUI) {
    const gui = new GUI();
    gui.add( guiParams, 'height', 0, 50, 0.1 ).name( 'Skybox height' ).onChange( render );
    gui.add( guiParams, 'radius', 200, 1000, 0.1 ).name( 'Skybox radius' ).onChange( render );
    gui.add( guiParams, 'xRot', 0, 360, 1 ).name( 'X Rotation' ).onChange( render );
    gui.add( guiParams, 'yRot', 0, 360, 1 ).name( 'Y Rotation' ).onChange( render );
    gui.add( guiParams, 'zRot', 0, 360, 1 ).name( 'Z Rotation' ).onChange( render );
  }
  // await createSkybox()
}

const createSkybox = async () => {
  const hdrLoader = new RGBELoader();
  const skyboxSrc = require('./assets/hdr.hdr').default;
  const envMap = await hdrLoader.loadAsync(skyboxSrc);
  envMap.mapping = THREE.EquirectangularReflectionMapping;

  skybox = new GroundProjectedSkybox( envMap );
  skybox.scale.setScalar( 100 );
  skybox.height = guiParams.height;
  skybox.radius = guiParams.radius;
  scene.add( skybox );

  scene.environment = envMap;
}

// Handle window resize
const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  render()
}
window.addEventListener('resize', onWindowResize, false)

const createCube = () => {
  // Create a cube
  const geometry = new THREE.BoxGeometry()
  const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      wireframe: true,
  })
  cube = new THREE.Mesh(geometry, material)
  cube.position.y = 2.5
  cube.scale.setScalar( 2 );
  scene.add(cube)
}

// Animate the cube
const animate = () => {
    requestAnimationFrame(animate)
    cube.rotation.x += 0.01
    cube.rotation.y += 0.01
    if (cubeGoingUp) {
      // Toggle when above 3
      if (cube.position.y >= 3) cubeGoingUp = false
      cube.position.y += 0.0025
    } else {
      // Toggle when below 2
      if (cube.position.y <= 2) cubeGoingUp = true
      cube.position.y -= 0.0025
    }
    
    render()
}

const loadLumaSplats = () => {
  let hallwaySplat = new LumaSplatsThree({
    source: 'https://lumalabs.ai/capture/2da24639-7abd-40dc-8d6d-d8b552ddafc9',
    enableThreeShaderIntegration: false,
  });

  nightriderSplat = new LumaSplatsThree({
    source: 'https://lumalabs.ai/capture/d2a31363-6ead-40a4-9f47-e40394b9804c',
    enableThreeShaderIntegration: false,
  });

  nightriderSplat.semanticsMask = LumaSplatsSemantics.FOREGROUND;
  
  hallwaySplat.position.set(1.5, 2.5, 0);
  nightriderSplat.position.set(0, 2, 0);
  nightriderSplat.rotation.x = THREE.MathUtils.degToRad(guiParams.xRot);
  nightriderSplat.rotation.y = THREE.MathUtils.degToRad(guiParams.yRot);
  nightriderSplat.rotation.z = THREE.MathUtils.degToRad(guiParams.zRot);
  nightriderSplat.scale.setScalar(0.25);

  function setSineWaveSplatModel(model: LumaSplatsThree) {
    model.setShaderHooks({
      vertexShaderHooks: {
        additionalUniforms: {
          time_s: ['float', uniformTime],
        },
        getSplatTransform: /*glsl*/ `
        (vec3 position, uint layersBitmask) {
          vec3 wave = vec3(
            sin(position.x * 6.0 + time_s * 0.5) * 0.2,
            sin(position.y * 4.0 + time_s * 2.0), // + sin(position.x * 5.0 + time_s * 0.5) * 0.2,
            cos(position.z * 6.0 + time_s * 3.0) * 0.2
          );
          
          vec3 twist = vec3(
            wave.y * sin(time_s * 0.5),
            wave.x * cos(time_s * 0.5),
            wave.x * sin(time_s * 0.5) + wave.y
          );
          
          return mat4(
            1., 0., 0., twist.x,
            0., 1., 0., twist.y,
            0., 0., 1., twist.z,
            0., 0., 0.,     1.
          );
        }
        `,
      }
    });
  }

  setSineWaveSplatModel(nightriderSplat)

  type LumaShaderHooks = {

    /** Hooks added to the vertex shader */
    vertexShaderHooks?: {
      additionalUniforms?: { [name: string]: [UniformTypeGLSL, { value: any }] },
  
      /** Inject into global space (for example, to add a varying) */
      additionalGlobals?: string,
  
      /**
       * Example `(vec3 splatPosition, uint layersBitmask) { return mat4(1.); }`
       * @param {vec3} splatPosition, object-space
       * @param {uint} layersBitmask, bit mask of layers, where bit 0 is background and bit 1 is foreground
       * @returns {mat4} per-splat local transform
       */
      getSplatTransform?: string,
  
      /**
       * Executed at the end of the main function after gl_Position is set
       * 
       * Example `() {
       *  vPosition = gl_Position;
       * }`
       * @returns {void}
       */
      onMainEnd?: string,
  
      /**
       * Example `(vec4 splatColor, vec3 splatPosition) { return pow(splatColor.rgb, vec3(2.2), splatColor.a); }`
       * Use `gl_Position` is available
       * @param {vec4} splatColor, default splat color
       * @param {vec3} splatPosition, object-space
       * @param {uint} layersBitmask, bit mask of layers, where bit 0 is background and bit 1 is foreground
       * @returns {vec4} updated splat color
       */
      getSplatColor?: string,
    },
  
    /** Hooks added to the fragment shader */
    fragmentShaderHooks?: {
      additionalUniforms?: { [name: string]: [UniformTypeGLSL, { value: any }] },
  
      /** Inject into global space (for example, to add a varying) */
      additionalGlobals?: string,
  
      /**
       * Example `(vec4 fragColor) { return tonemap(fragColor); }`
       * @param {vec4} fragColor, default fragment color
       * @returns {vec4} updated fragment color
       */
      getFragmentColor?: string,
    }
  }

  scene.add(hallwaySplat);
  scene.add(nightriderSplat);
}

function updateSplatTime() {
  requestAnimationFrame(updateSplatTime);
  uniformTime.value = clock.getElapsedTime();
  render()
}

function render() {
    renderer.render(scene, camera)
    if (skybox) {
      if (SHOW_GUI) {
        skybox.radius = guiParams.radius;
        skybox.height = guiParams.height;
      }
    }
    if (nightriderSplat) {
      if (SHOW_GUI) {
        nightriderSplat.rotation.x = THREE.MathUtils.degToRad(guiParams.xRot);
        nightriderSplat.rotation.y = THREE.MathUtils.degToRad(guiParams.yRot);
        nightriderSplat.rotation.z = THREE.MathUtils.degToRad(guiParams.zRot);
      }
    }
}

init().then(render)
// createCube()
// animate()
updateSplatTime()
loadLumaSplats()