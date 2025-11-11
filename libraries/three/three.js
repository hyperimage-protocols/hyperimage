import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

// Get canvas element
const canvas = document.getElementById('canvas');

// Create scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Create camera
const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.z = 5;

// Create renderer
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = false;

// Store materials for toggling
const meshMaterials = new Map();

// Load the GLB model
const loader = new GLTFLoader();
loader.load(
    'scan.glb',
    (gltf) => {
        const model = gltf.scene;

        // Store original materials and set back-face culling
        model.traverse((child) => {
            if (child.isMesh) {
                const originalMat = child.material;

                // Create unlit material with just the diffuse color
                const unlitMat = new THREE.MeshBasicMaterial({
                    map: originalMat.map,
                    color: originalMat.color,
                    side: THREE.FrontSide
                });

                // Create white material
                const whiteMat = new THREE.MeshLambertMaterial({
                    color: 0xffffff,
                    side: THREE.FrontSide
                });

                // Create wireframe for this mesh
                const wireframeGeo = new THREE.WireframeGeometry(child.geometry);
                const wireframeMat = new THREE.LineBasicMaterial({ color: 0xffffff });
                const wireframe = new THREE.LineSegments(wireframeGeo, wireframeMat);
                wireframe.visible = false;

                // Copy the mesh's transform to the wireframe
                wireframe.position.copy(child.position);
                wireframe.rotation.copy(child.rotation);
                wireframe.scale.copy(child.scale);
                wireframe.matrix.copy(child.matrix);
                wireframe.matrixWorld.copy(child.matrixWorld);

                // Add wireframe to the parent, not the mesh
                if (child.parent) {
                    child.parent.add(wireframe);
                }

                // Store materials
                meshMaterials.set(child, {
                    lit: originalMat,
                    unlit: unlitMat,
                    white: whiteMat,
                    wireframe: wireframe
                });

                // Set back-face culling on original material
                child.material.side = THREE.FrontSide;
            }
        });

        scene.add(model);
        console.log('Model loaded successfully');

        // Apply initial material and visibility settings
        updateVisibility();
    },
    (progress) => {
        console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
    },
    (error) => {
        console.error('Error loading model:', error);
    }
);

// Add single directional light
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Light and material controls
const guiControls = {
    viewAngle: 75,
    azimuth: 45,
    elevation: 45,
    useLighting: false,
    showMaterial: true,
    showGeometry: true,
    showWireframe: true
};

// GUI for controls
const gui = new GUI({ title: '' });
gui.close = () => {}; // Disable closing
gui.open(); // Always open

// Top level controls
const viewAngleControl = gui.add(guiControls, 'viewAngle', 20, 120).name('View Angle').onChange(updateViewAngle);
const wireframeControl = gui.add(guiControls, 'showWireframe').name('Wireframe').onChange(updateVisibility);
const geometryControl = gui.add(guiControls, 'showGeometry').name('Geometry').onChange(() => {
    updateVisibility();
    updateGUIVisibility();
});

// Geometry-dependent controls
const lightingControl = gui.add(guiControls, 'useLighting').name('Lighting').onChange(() => {
    updateMaterial();
    updateGUIVisibility();
});

// Lighting-dependent controls
const materialControl = gui.add(guiControls, 'showMaterial').name('Material').onChange(updateVisibility);
const azimuthControl = gui.add(guiControls, 'azimuth', 0, 360).name('Azimuth').onChange(updateLightPosition);
const elevationControl = gui.add(guiControls, 'elevation', -90, 90).name('Elevation').onChange(updateLightPosition);

function updateGUIVisibility() {
    // Show lighting control only if geometry is visible
    if (guiControls.showGeometry) {
        lightingControl.show();
    } else {
        lightingControl.hide();
    }

    // Show material and light controls only if geometry is visible and lighting is enabled
    if (guiControls.showGeometry && guiControls.useLighting) {
        materialControl.show();
        azimuthControl.show();
        elevationControl.show();
    } else {
        materialControl.hide();
        azimuthControl.hide();
        elevationControl.hide();
    }
}

// Initialize GUI visibility
updateGUIVisibility();

function updateMaterial() {
    meshMaterials.forEach((materials, mesh) => {
        if (!guiControls.showMaterial) {
            mesh.material = materials.white;
        } else if (guiControls.useLighting) {
            mesh.material = materials.lit;
        } else {
            mesh.material = materials.unlit;
        }
    });
}

function updateVisibility() {
    updateMaterial();
    meshMaterials.forEach((materials, mesh) => {
        mesh.visible = guiControls.showGeometry;
        materials.wireframe.visible = guiControls.showWireframe;
    });
}

function updateViewAngle() {
    camera.fov = guiControls.viewAngle;
    camera.updateProjectionMatrix();
}

function updateLightPosition() {
    const phi = THREE.MathUtils.degToRad(90 - guiControls.elevation);
    const theta = THREE.MathUtils.degToRad(guiControls.azimuth);

    directionalLight.position.x = 10 * Math.sin(phi) * Math.cos(theta);
    directionalLight.position.y = 10 * Math.cos(phi);
    directionalLight.position.z = 10 * Math.sin(phi) * Math.sin(theta);
}

updateViewAngle();
updateLightPosition();

// Add orbit controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.25;

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Update controls
    controls.update();

    // Render the scene
    renderer.render(scene, camera);
}

animate();
