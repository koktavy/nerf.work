// From: https://sbcode.net/threejs/threejs-typescript-boilerplate/

import * as THREE from 'three'

import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GroundProjectedSkybox } from 'three/examples/jsm/objects/GroundProjectedSkybox.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const guiParams = {
  height: 12.5,
  radius: 360
};

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let skybox: GroundProjectedSkybox
let cube: THREE.Mesh

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
  camera.position.z = 2
  // renderer
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.useLegacyLights = false
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  document.body.appendChild(renderer.domElement)
  // controls
  const controls = new OrbitControls( camera, renderer.domElement );
  controls.addEventListener( 'change', render );
  controls.target.set( 0, 2, 0 );
  controls.maxPolarAngle = THREE.MathUtils.degToRad( 80 ); // ground
  controls.minPolarAngle = THREE.MathUtils.degToRad( 30 ); // sky
  controls.maxDistance = 12;
  controls.minDistance = 4;
  controls.enablePan = false;
  controls.update();
  // gui
  if (SHOW_GUI) {
    const gui = new GUI();
    gui.add( guiParams, 'height', 0, 50, 0.1 ).name( 'Skybox height' ).onChange( render );
    gui.add( guiParams, 'radius', 200, 1000, 0.1 ).name( 'Skybox radius' ).onChange( render );
  }
  await createSkybox()
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

function render() {
    renderer.render(scene, camera)
    if (skybox) {
      if (SHOW_GUI) {
        skybox.radius = guiParams.radius;
        skybox.height = guiParams.height;
      }
    } else {
      console.log('no skybox')
    }
}

init().then(render)
createCube()
animate()