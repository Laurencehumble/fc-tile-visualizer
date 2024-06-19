import * as THREE from './three.js-master/build/three.module.js';
import { GLTFLoader } from './three.js-master/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from './three.js-master/examples/jsm/loaders/RGBELoader.js';
import { OrbitControls } from './three.js-master/examples/jsm/controls/OrbitControls.js';
import { DRACOLoader } from './three.js-master/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from './three.js-master/examples/jsm/loaders/KTX2Loader.js';

// Function to detect if the device is mobile
function isMobile() {
  return /Mobi|Android/i.test(navigator.userAgent);
}

// Select the canvas element
const canvas = document.querySelector('.webgl');

// Create the scene
const scene = new THREE.Scene();

// Create the camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 1); // Set camera position (x, y, z)

// Create the renderer
const renderer = new THREE.WebGLRenderer({
  antialias: false,  // Disable antialiasing for all devices
  canvas: canvas
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(isMobile() ? 1 : Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.6;
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

const spotLight = new THREE.SpotLight(0xffffff, 50);
spotLight.position.set(0, 10, 0);
spotLight.angle = Math.PI / 2;
spotLight.penumbra = 0;
spotLight.decay = 1;
spotLight.distance = 0;
spotLight.castShadow = true;
spotLight.shadow.mapSize.width = 1024;
spotLight.shadow.mapSize.height = 1024;
spotLight.shadow.camera.near = 1;
spotLight.shadow.camera.far = 10;
spotLight.shadow.focus = 1;
scene.add(spotLight);

const lightHelper = new THREE.SpotLightHelper(spotLight);
scene.add(lightHelper);

lightHelper.visible = false;

// Add orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Enable smooth motion
controls.dampingFactor = 0.2; // Damping inertia
controls.enableZoom = false; // Disable zooming
controls.enablePan = false; // Disable panning

// Handle window resize
window.addEventListener('resize', debounce(() => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(isMobile() ? 1 : Math.min(window.devicePixelRatio, 2));
}, 200));

// Create a loading manager
const loadingManager = new THREE.LoadingManager();

const progressBar = document.getElementById('progress-bar');

loadingManager.onProgress = function(url, loaded, total) {
  progressBar.value = (loaded / total) * 100;
}

const progressBarContainer = document.querySelector('.progress-bar-container');

loadingManager.onLoad = function() {
  progressBarContainer.style.display = 'none';
  console.log('All assets loaded.');
  animate(); // Start animation loop after assets are loaded
};

loadingManager.onError = function(url) {
  console.log('There was an error loading ' + url);
};

// Load HDR environment map
new RGBELoader(loadingManager).load('assets/montorfano_4k.hdr', function(texture) {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = texture;
  scene.environment = texture;
});

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
dracoLoader.setDecoderConfig({type: 'js'});
const loader = new GLTFLoader(loadingManager);
loader.setDRACOLoader(dracoLoader);

// Load different models and textures for mobile and desktop
const modelPath = isMobile() ? 'assets/livingroom-good-sample2.gltf' : 'assets/livingroom-good-sample2.gltf';

loader.load(modelPath, function(gltf) {
  const model = gltf.scene;

  model.traverse((child) => {
    if (child.isMesh) {
      if (child.name.includes('Wall')) {
        child.userData.type = 'wall';
      } else if (child.name.includes('Floor')) {
        child.userData.type = 'floor';
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

    if (intersect && intersect.object.isMesh && (intersect.object.userData.type === 'wall' || intersect.object.userData.type === 'floor')) {
      // Remove any existing highlighted object
      if (window.highlightedObject) {
        window.highlightedObject.material.emissive.setHex(0x000000); // Reset the material of the previously highlighted object
        window.highlightedObject = null;
      }

      // Set the material of the clicked object to make it appear highlighted
      intersect.object.material.emissive.setHex(0xBF1901); // Set the emissive color to gray (you can adjust this color)

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

const ktx2Loader = new KTX2Loader()
  .setTranscoderPath('three.js-master/examples/jsm/libs/basis/') // Set the path to Basis transcoder
  .detectSupport(renderer); // Pass the renderer to detect hardware capabilities

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

// Tooltip setup
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

    if (intersect && intersect.object.isMesh && (intersect.object.userData.type === 'wall' || intersect.object.userData.type === 'floor')) {
      tooltip.style.display = 'block';

      let tooltipX = event.clientX + 10;
      let tooltipY = event.clientY + 10;

      if (tooltipX + tooltip.clientWidth > window.innerWidth) {
        tooltipX = event.clientX - tooltip.clientWidth - 10;
      }
      if (tooltipY + tooltip.clientHeight > window.innerHeight) {
        tooltipY = event.clientY - tooltip.clientHeight - 10;
      }

      tooltip.style.left = `${tooltipX}px`;
      tooltip.style.top = `${tooltipY}px`;

      // Check the type of the intersected object and set the tooltip text
      if (intersect.object.userData.type === 'wall') {
        tooltip.textContent = 'Wall';
      } else if (intersect.object.userData.type === 'floor') {
        tooltip.textContent = 'Floor';
      }
    } else {
      tooltip.style.display = 'none'; // Hide the tooltip if not hovering over a wall or floor
    }
  } else {
    tooltip.style.display = 'none'; // Hide the tooltip if not intersecting with any object
  }
}


// Add event listener for mouse move
window.addEventListener('mousemove', throttle(onMouseMove, 100), false);

// Add event listener for the hide button
const hideButton = document.getElementById('hide-sidebar');
hideButton.addEventListener('click', (e) => {
  const sidebar = document.querySelector('.sidebar');
  sidebar.style.display = sidebar.style.display === 'none' ? 'block' : 'none';
  e.stopPropagation(); // Stop the click event from propagating
});

const hideButton2 = document.getElementById('hide-sidebar2');
hideButton2.addEventListener('click', (e) => {
  const instruction = document.querySelector('.instruction');
  instruction.style.display = instruction.style.display === 'none' ? 'block' : 'none';
  e.stopPropagation(); // Stop the click event from propagating
});

const hideButton3 = document.getElementById('hide-sidebar3');
hideButton3.addEventListener('click', (e) => {
  const instruction2 = document.querySelector('.instruction2');
  instruction2.style.display = instruction2.style.display === 'none' ? 'block' : 'none';
  e.stopPropagation(); // Stop the click event from propagating
});

// Resource cleanup
function disposeResources() {
  scene.traverse((object) => {
    if (object.isMesh) {
      object.geometry.dispose();
      object.material.dispose();
      if (object.material.map) object.material.map.dispose();
    }
  });
}

// Handle window unload event to clean up resources
window.addEventListener('beforeunload', disposeResources);

// Initial call to start the animation loop
animate();

// Utility functions for debounce and throttle
function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this, args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

function throttle(func, limit) {
  let lastFunc;
  let lastRan;
  return function() {
    const context = this, args = arguments;
    if (!lastRan) {
      func.apply(context, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(function() {
        if ((Date.now() - lastRan) >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}
