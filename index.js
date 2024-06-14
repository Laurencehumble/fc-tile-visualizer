import * as THREE from './three.js-master/build/three.module.js';
import { GLTFLoader } from './three.js-master/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from './three.js-master/examples/jsm/loaders/RGBELoader.js';
import { OrbitControls } from './three.js-master/examples/jsm/controls/OrbitControls.js';

// Select the canvas element
const canvas = document.querySelector('.webgl');

// Create the scene
const scene = new THREE.Scene();

// Create the camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 1); // Set camera position (x, y, z)

// Create the renderer
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  canvas: canvas
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.6;
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

// Add directional light to the scene
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(2, 2, 5);
scene.add(light);

// Add orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Enable smooth motion
controls.dampingFactor = 0.2; // Damping inertia
controls.enableZoom = false; // Enable zooming
controls.enablePan = false; // Enable panning

// Create a loading manager
let loadingManager = new THREE.LoadingManager();

const progressBar = document.getElementById('progress-bar');

loadingManager.onProgress = function(url, loaded, total) {
    progressBar.value = (loaded / total) * 100;
}

const progressBarContainer = document.querySelector('.progress-bar-container');

loadingManager.onLoad = function () {
  progressBarContainer.style.display = 'none';
  console.log('All assets loaded.');
  animate(); // Start animation loop after assets are loaded
};

loadingManager.onError = function (url) {
  console.log('There was an error loading ' + url);
};

// Load HDR environment map
new RGBELoader(loadingManager).load('assets/montorfano_4k.hdr', function (texture) {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = texture;
  scene.environment = texture;
});

// Load GLTF model
let model;
const loader = new GLTFLoader(loadingManager);
loader.load('assets/livingroom-good-sample.gltf', function (gltf) {
  model = gltf.scene;
  
  // Tag walls and floors in the model
  model.traverse((child) => {
    if (child.isMesh) {
      if (child.name.includes('Plane001')) {
        child.userData.type = 'wall';
        console.log('Tagged wall:', child.name);
      } else if (child.name.includes('Floor')) {
        child.userData.type = 'floor';
        console.log('Tagged floor:', child.name);
      }
    }
  });

  scene.add(model);
});

// Animation loop
function animate() {
  controls.update(); // Update orbit controls
  renderer.render(scene, camera); // Render the scene
  requestAnimationFrame(animate); // Request the next frame
}

// Raycasting setup
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let highlightEdges;

function onMouseClick(event) {
  // Convert mouse position to normalized device coordinates (-1 to +1) for both components.
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Update the raycaster with the camera and mouse position
  raycaster.setFromCamera(mouse, camera);

  // Calculate objects intersecting the picking ray
  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
    const intersect = intersects[0];

    if (intersect && intersect.object.isMesh) {
      // Remove any existing highlighted object
      if (window.highlightedObject) {
        window.highlightedObject.material.emissive.setHex(0x000000); // Reset the material of the previously highlighted object
        window.highlightedObject = null;
      }

      // Set the material of the clicked object to make it appear highlighted
      intersect.object.material.emissive.setHex(0xE56262); // Set the emissive color to gold (you can adjust this color)

      // Store the clicked object globally for texture application
      window.clickedObject = intersect.object;
      console.log('Clicked object:', window.clickedObject.name, window.clickedObject.userData.type);

      // Show/hide texture containers based on the clicked object's type
      const sidebar = document.querySelector('.sidebar');
      const wallTexturesContainer = document.querySelector('.wall-textures-container');
      const floorTexturesContainer = document.querySelector('.floor-textures-container');

      sidebar.style.display = 'block'; // Show the sidebar

      if (window.clickedObject.userData.type === 'wall') {
        wallTexturesContainer.style.display = 'block';
        floorTexturesContainer.style.display = 'none';
      } else if (window.clickedObject.userData.type === 'floor') {
        wallTexturesContainer.style.display = 'none';
        floorTexturesContainer.style.display = 'block';
      }

      // Store the highlighted object globally
      window.highlightedObject = intersect.object;
    }
  } else {
    // Hide the sidebar if no wall or floor is clicked
    const sidebar = document.querySelector('.sidebar');
    sidebar.style.display = 'none';
  }
}

// Add event listener for mouse click
window.addEventListener('click', onMouseClick, false);

// Function to handle texture change
function changeTexture(textureUrl, type, repeatX = 1, repeatY = 1) {
  const textureLoader = new THREE.TextureLoader();
  const newTexture = textureLoader.load(textureUrl);
  newTexture.wrapS = THREE.RepeatWrapping;
  newTexture.wrapT = THREE.RepeatWrapping;
  newTexture.repeat.set(repeatX, repeatY);

  // Apply the new texture to the clicked object only if the type matches
  if (window.clickedObject && window.clickedObject.userData.type === type) {
    console.log('Changing texture of:', window.clickedObject.name, 'to', textureUrl);
    window.clickedObject.material.map = newTexture;
    window.clickedObject.material.needsUpdate = true;
  } else {
    console.log('Texture type mismatch:', window.clickedObject ? window.clickedObject.userData.type : 'No object clicked', type);
  }
}

// Add event listeners for sidebar images
const wallTextures = document.querySelectorAll('.wall-textures img');
wallTextures.forEach(img => {
  img.addEventListener('click', (e) => {
    const textureUrl = e.target.dataset.texture;
    changeTexture(textureUrl, 'wall', 3, 3);

    // Reset the highlight
    if (window.highlightedObject) {
      window.highlightedObject.material.emissive.setHex(0x000000);
      window.highlightedObject = null;
    }
     // Stop the click event from propagating
     e.stopPropagation();
  });
});

const floorTextures = document.querySelectorAll('.floor-textures img');
floorTextures.forEach(img => {
  img.addEventListener('click', (e) => {
    const textureUrl = e.target.dataset.texture;
    changeTexture(textureUrl, 'floor', 3, 3);

    // Reset the highlight
    if (window.highlightedObject) {
      window.highlightedObject.material.emissive.setHex(0x000000);
      window.highlightedObject = null;
    }
     // Stop the click event from propagating
     e.stopPropagation();
  });
});

// Tooltip logic
const tooltip = document.getElementById('tooltip');

function onMouseMove(event) {
  // Convert mouse position to normalized device coordinates (-1 to +1) for both components.
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Update the raycaster with the camera and mouse position
  raycaster.setFromCamera(mouse, camera);

  // Calculate objects intersecting the picking ray
  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
    const intersect = intersects[0];

    if (intersect && intersect.object.isMesh) {
      // Display tooltip
      tooltip.style.display = 'block';
      tooltip.style.left = `${event.clientX + 10}px`;
      tooltip.style.top = `${event.clientY + 10}px`;

      if (intersect.object.userData.type === 'wall') {
        tooltip.textContent = 'Wall';
      } else if (intersect.object.userData.type === 'floor') {
        tooltip.textContent = 'Floor';
      }
    } else {
      tooltip.style.display = 'none';
    }
  } else {
    tooltip.style.display = 'none';
  }
}

// Add event listener for mouse move
window.addEventListener('mousemove', onMouseMove, false);

// Add event listener for the hide button
const hideButton = document.getElementById('hide-sidebar');
hideButton.addEventListener('click', (e) => {
    const sidebar = document.querySelector('.sidebar');
    sidebar.style.display = sidebar.style.display === 'none' ? 'block' : 'none';
     // Stop the click event from propagating
     e.stopPropagation();
});

const hideButton2 = document.getElementById('hide-sidebar2');
hideButton2.addEventListener('click', (e) => {
    const instruction = document.querySelector('.instruction');
    instruction.style.display = instruction.style.display === 'none' ? 'block' : 'none';
     // Stop the click event from propagating
     e.stopPropagation();
});

const hideButton3 = document.getElementById('hide-sidebar3');
hideButton3.addEventListener('click', (e) => {
    const instruction2 = document.querySelector('.instruction2');
    instruction2.style.display = instruction2.style.display === 'none' ? 'block' : 'none';
     // Stop the click event from propagating
     e.stopPropagation();
});