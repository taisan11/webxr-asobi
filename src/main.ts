import "main.css"

import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let grabbedObject: THREE.Mesh | null = null;

init();
animate();

function init(): void {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111111);

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 50);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);
  document.body.appendChild(VRButton.createButton(renderer));

  // Light
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
  const dir = new THREE.DirectionalLight(0xffffff, 1);
  dir.position.set(1, 2, 1);
  scene.add(dir);

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({ color: 0x222222 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // Grab object
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.15, 0.15),
    new THREE.MeshStandardMaterial({ color: 0x00ffcc })
  );
  box.position.set(0, 1.2, -0.5);
  box.name = 'grabbable';
  scene.add(box);

  // Hand tracking
  const handFactory = new XRHandModelFactory();

  for (let i = 0; i < 2; i++) {
    const hand = renderer.xr.getHand(i);
    scene.add(hand);

    const handModel = handFactory.createHandModel(hand, 'mesh');
    hand.add(handModel);

    hand.userData.joints = {};
    hand.addEventListener('connected', (e) => {
      hand.userData.inputSource = e.data;
    });

    scene.add(hand);
  }

  window.addEventListener('resize', onWindowResize);
}

function onWindowResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(): void {
  renderer.setAnimationLoop(render);
}

function render(): void {
  handleHands();
  renderer.render(scene, camera);
}

function handleHands(): void {
  const box = scene.getObjectByName('grabbable');
  if (!box) return;

  renderer.xr.getSession()?.inputSources.forEach((source: XRInputSource) => {
    if (!source.hand) return;

    const thumb = source.hand.get('thumb-tip');
    const index = source.hand.get('index-finger-tip');

    if (!thumb || !index) return;

    const thumbPos = new THREE.Vector3().setFromMatrixPosition(thumb.transform.matrix);
    const indexPos = new THREE.Vector3().setFromMatrixPosition(index.transform.matrix);

    const pinchDistance = thumbPos.distanceTo(indexPos);

    // ピンチ判定（距離が近い）
    if (pinchDistance < 0.02) {
      if (!grabbedObject) {
        const boxPos = box.position.clone();
        if (boxPos.distanceTo(indexPos) < 0.15) {
          grabbedObject = box as THREE.Mesh;
        }
      }
    } else {
      grabbedObject = null;
    }

    if (grabbedObject) {
      grabbedObject.position.copy(indexPos);
    }
  });
}
