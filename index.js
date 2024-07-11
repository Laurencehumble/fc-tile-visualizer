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
renderer.toneMappingExposure = 0.3;
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

// Add ambient light
const ambientLight = new THREE.AmbientLight(0xffffff, 3);
scene.add(ambientLight);

// Create the first DirectionalLight
const dl = new THREE.DirectionalLight(0xFFE5CD, 3);
dl.castShadow = true;
dl.position.set(0, 8, -10); // Position it above the scene
dl.target.position.set(0, -5, 0); // Point it towards the origin (or the target area)
scene.add(dl);
scene.add(dl.target);

// Create the second DirectionalLight
const pl = new THREE.DirectionalLight(0xFFF0CE, 3); 
pl.castShadow = true;
pl.position.set(0, 3.5, 0); // Position it above the scene
pl.target.position.set(0, 0, 0); // Point it towards the origin (or the target area)
scene.add(pl);
scene.add(pl.target);

// Add helpers for visualization
const dlHelper = new THREE.DirectionalLightHelper(dl);
scene.add(dl);

const plHelper = new THREE.DirectionalLightHelper(pl);
scene.add(pl);

// GUI Setup
// const gui = new GUI();
// const plSettings = { visible: true, color: pl.color.getHex() };
// const plFolder = gui.addFolder('Point Light');
// plFolder.add(plSettings, 'visible').onChange(value => {
//     pl.visible = value;
//     plHelper.visible = value;
// });
// plFolder.add(pl, 'intensity', 0, 2, 0.25);
// plFolder.add(pl.position, 'x', -2, 4, 0.5);
// plFolder.add(pl.position, 'y', -2, 4, 0.5);
// plFolder.add(pl.position, 'z', -2, 4, 0.5);
// plFolder.add(pl, 'castShadow');
// plFolder.addColor(plSettings, 'color').onChange(value => pl.color.set(value));
// plFolder.open();


// Add orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Enable smooth motion
controls.dampingFactor = 0.2; // Damping inertia
controls.enableZoom = true; // Disable zooming
controls.enablePan = true; // Disable panning

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
new RGBELoader(loadingManager).load('assets/montorfano_1k.hdr', function(texture) {
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
function applyDefaultTexture(object, textureUrl, repeatX, repeatY) {
  const textureLoader = new THREE.TextureLoader();
  const defaultTexture = textureLoader.load(textureUrl, () => {
    // Once the texture is loaded, create a canvas for the border effect
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // Set canvas size based on texture size
    canvas.width = defaultTexture.image.width;
    canvas.height = defaultTexture.image.height;
    
    // Draw the original texture on the canvas
    context.drawImage(defaultTexture.image, 0, 0, canvas.width, canvas.height);
    
    // Draw a black border around the texture
    context.strokeStyle = '#ffffff'; // Black color
    context.lineWidth = 2;
    context.strokeRect(0, 0, canvas.width, canvas.height);
    
    // Create a new texture from the canvas
    const borderedTexture = new THREE.CanvasTexture(canvas);
    borderedTexture.wrapS = THREE.RepeatWrapping;
    borderedTexture.wrapT = THREE.RepeatWrapping;
    borderedTexture.repeat.set(repeatX, repeatY);
    
    // Assign the bordered texture to the object's material
    object.material.map = borderedTexture;
    object.material.needsUpdate = true;
  });

  defaultTexture.wrapS = THREE.RepeatWrapping;
  defaultTexture.wrapT = THREE.RepeatWrapping;
  defaultTexture.repeat.set(repeatX, repeatY);
}

const modelPath = isMobile() ? 'assets/Bathroom.gltf' : 'assets/Bathroom.gltf';

loader.load(modelPath, function(gltf) {
  const model = gltf.scene;

  model.traverse((child) => {
    if (child.isMesh) {
      if (child.name.includes('Wall')) {
        child.userData.type = 'wall';
        applyDefaultTexture(child, 'img/wall1.jpg', 6, 10); // Adjust repeat values for walls
      } else if (child.name.includes('Floor')) {
        child.userData.type = 'floor';
        applyDefaultTexture(child, 'img/floor1.jpg', 10, 5); // Adjust repeat values for floors
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

// Set up KTX2Loader
const ktx2Loader = new KTX2Loader()
  .setTranscoderPath('three.js-master/examples/jsm/libs/basis/') // Set the path to Basis transcoder
  .detectSupport(renderer); // Pass the renderer to detect hardware capabilities

// Load HDR environment map
ktx2Loader.load('assets/montorfano_1k.ktx2', function(texture) {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = texture;
  scene.environment = texture;
});

// Function to handle texture change
function changeTexture(textureUrl, type, repeatX = 1, repeatY = 1) {
  const textureLoader = new THREE.TextureLoader();

  // Load the texture
  const newTexture = textureLoader.load(textureUrl, (loadedTexture) => {
    // Create a canvas for the bordered effect
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = loadedTexture.image.width;
    canvas.height = loadedTexture.image.height;

    // Draw the texture on the canvas
    context.drawImage(loadedTexture.image, 0, 0, canvas.width, canvas.height);

    // Add a black border
    context.strokeStyle = '#ffffff';
    context.lineWidth = 2;
    context.strokeRect(0, 0, canvas.width, canvas.height);

    // Create a new texture from the canvas
    const borderedTexture = new THREE.CanvasTexture(canvas);
    borderedTexture.wrapS = THREE.RepeatWrapping;
    borderedTexture.wrapT = THREE.RepeatWrapping;
    borderedTexture.repeat.set(repeatX, repeatY);

    // Apply the new texture to the clicked object only if the type matches
    if (window.clickedObject && window.clickedObject.userData.type === type) {
      window.clickedObject.material.map = borderedTexture;
      window.clickedObject.material.needsUpdate = true;
    }
  });

  newTexture.wrapS = THREE.RepeatWrapping;
  newTexture.wrapT = THREE.RepeatWrapping;
  newTexture.repeat.set(repeatX, repeatY);
}

// Add event listeners for sidebar images
const wallTextures = document.querySelectorAll('.wall-textures img');
wallTextures.forEach(img => {
  img.addEventListener('click', (e) => {
    const textureUrl = e.target.dataset.texture;
    changeTexture(textureUrl, 'wall', 6, 10);

    // Reset the highlight
    if (window.highlightedObject) {
      window.highlightedObject.material.emissive.setHex(0x000000);
      window.highlightedObject = null;
    }
    e.stopPropagation();
  });
});

const floorTextures = document.querySelectorAll('.floor-textures img');
floorTextures.forEach(img => {
  img.addEventListener('click', (e) => {
    const textureUrl = e.target.dataset.texture;
    changeTexture(textureUrl, 'floor', 10, 5);

    // Reset the highlight
    if (window.highlightedObject) {
      window.highlightedObject.material.emissive.setHex(0x000000);
      window.highlightedObject = null;
    }
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

// Function to handle texture size change for walls
// Function to handle texture size change for walls
function changeWallTextureSize(size) {
  if (window.clickedObject && window.clickedObject.userData.type === 'wall') {
    const texture = window.clickedObject.material.map.clone(); // Clone the current texture to start fresh
    const [width, height] = size.split('x').map(Number);

    // Calculate repeat values based on the size
    const repeatX = 1 / (width / 200);
    const repeatY = 1 / (height / 350);

    // Set repeat and offset values
    texture.repeat.set(repeatX, repeatY);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    // Set texture filtering to nearest to avoid blurring when scaled down
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;

    // Apply the new texture to the clicked object
    window.clickedObject.material.map = texture;
    window.clickedObject.material.needsUpdate = true;
  }
}

// Function to handle texture size change for floors
function changeFloorTextureSize(size) {
  if (window.clickedObject && window.clickedObject.userData.type === 'floor') {
    const texture = window.clickedObject.material.map.clone(); // Clone the current texture to start fresh
    const [width, height] = size.split('x').map(Number);

    // Calculate repeat values based on the size
    const repeatX = 1 / (width / 350);
    const repeatY = 1 / (height / 200);

    // Set repeat and offset values
    texture.repeat.set(repeatX, repeatY);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    // Set texture filtering to nearest to avoid blurring when scaled down
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;

    // Apply the new texture to the clicked object
    window.clickedObject.material.map = texture;
    window.clickedObject.material.needsUpdate = true;
  }
}

// Event listener for size buttons
const sizeButtons = document.querySelectorAll('.size-buttons button');
sizeButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        e.stopPropagation(); // Stop the click event from propagating
        const size = e.target.dataset.size; // Get size from data-size attribute

        // Check if a clickedObject exists and its type (wall or floor)
        if (window.clickedObject) {
            if (window.clickedObject.userData.type === 'wall') {
                changeWallTextureSize(size); // Call function to change wall texture size
            } else if (window.clickedObject.userData.type === 'floor') {
                changeFloorTextureSize(size); // Call function to change floor texture size
            }
        }

        // Reset the highlight
        if (window.highlightedObject) {
            window.highlightedObject.material.emissive.setHex(0x000000);
            window.highlightedObject = null;
        }
    });
});

// Add event listeners for texture items in the sidebar
const textureItems = document.querySelectorAll('.texture-item');

textureItems.forEach(item => {
    const img = item.querySelector('img');
    const sizeButtons = item.querySelector('.size-buttons');
    const description = item.querySelector('.texture-description');

    img.addEventListener('click', () => {
        // Hide active elements first
        document.querySelectorAll('.size-buttons.active, .texture-description.active').forEach(activeElement => {
            activeElement.classList.remove('active');
        });

        // Toggle visibility for the clicked item
        sizeButtons.classList.toggle('active'); 
        description.classList.toggle('active'); 
    });

    const sizeButtonsList = sizeButtons.querySelectorAll('button');
    
    sizeButtonsList.forEach(button => {
        button.addEventListener('click', () => {
            const size = button.dataset.size;
            applyTextureSize(size); // Implement this function to apply texture size
        });
    });
});
