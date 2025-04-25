import * as THREE from 'three';
import { AutoMesh } from './mesh/automesh';
import { EyeMesh } from './mesh/eyeMesh';
import SlotMachine from './slot/SlotMachine';

function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  if (Array.isArray(material)) {
    for (const mat of material) {
      disposeSingleMaterial(mat);
    }
  } else {
    disposeSingleMaterial(material);
  }
}

function disposeSingleMaterial(material: THREE.Material): void {
  for (const key of Object.keys(material)) {
    const value = (material as any)[key];
    if (value && typeof value.dispose === 'function') {
      value.dispose();
    }
  }
  material.dispose();
}

class ThreeScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private autoMeshes: AutoMesh[] = [];
  private eyeMeshes: EyeMesh[] = [];
  private slotMachines: SlotMachine[] = [];
  private animationFrameId: number | null = null;

  private mousePosition: THREE.Vector2 = new THREE.Vector2();
  private mouseWorldPosition: THREE.Vector3 = new THREE.Vector3();
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private interactionPlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  constructor(container: HTMLElement) {
    this.container = container;

    this.scene = new THREE.Scene();

    const width = container.clientWidth;
    const height = container.clientHeight;
    const aspect = width / height;

    const viewSize = 5;

    this.camera = new THREE.OrthographicCamera(
        -viewSize * aspect, // left
         viewSize * aspect, // right
         viewSize,          // top
        -viewSize,          // bottom
         0.1,               // near
         1000               // far
    );
    this.camera.position.z = 5;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(container.clientWidth, container.clientHeight);

    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.pointerEvents = 'none';

    this.container.appendChild(this.renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5).normalize();
    this.scene.add(directionalLight);

    window.addEventListener('mousemove', this.onMouseMove.bind(this), false);

    this.animate();
  }

  public setInteractionPlaneZ(z: number): void {
      this.interactionPlane.constant = -z;
  }

  private onMouseMove(event: MouseEvent): void {
      const rect = this.container.getBoundingClientRect();
      const mouseXRelativeToContainer = event.clientX - rect.left;
      const mouseYRelativeToContainer = event.clientY - rect.top;

      const normalizedMouseX = mouseXRelativeToContainer / rect.width;
      const normalizedMouseY = mouseYRelativeToContainer / rect.height;

      this.mousePosition.x = normalizedMouseX * 2 - 1;
      // inverted, welcome to Graphic Programming 101 :)
      this.mousePosition.y = -(normalizedMouseY * 2 - 1);


      this.raycaster.setFromCamera(this.mousePosition, this.camera);
      const intersectPoint = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.interactionPlane, intersectPoint)) {
          this.mouseWorldPosition.copy(intersectPoint);
      }
  }

  public addAutoMesh(autoMesh: AutoMesh): void {
      this.autoMeshes.push(autoMesh);
      this.scene.add(autoMesh.getMesh());
  }

  public addEyeMesh(eyeMesh: EyeMesh): void {
      this.eyeMeshes.push(eyeMesh);
      this.scene.add(eyeMesh.getMesh());
  }

  public addSlotMachine(slotMachine: SlotMachine): void {
      this.slotMachines.push(slotMachine);
      for (const slot of slotMachine.getSlots()) {
          this.scene.add(slot.getMesh());
      }

      slotMachine.startAnimation();
  }

  setSize(width: number, height: number): void {
    const aspect = width / height;
    const viewSize = 5; 

    this.camera.left = -viewSize * aspect;
    this.camera.right = viewSize * aspect;
    this.camera.top = viewSize;
    this.camera.bottom = -viewSize;

    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.render();
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    let shouldUpdate = false;

    for (const eyeMesh of this.eyeMeshes) {
      if (eyeMesh.shouldUpdate(this.mouseWorldPosition)) {
        eyeMesh.update(this.mouseWorldPosition);
        shouldUpdate = true;
      }
    }

    for (const slotMachine of this.slotMachines) {
      if (slotMachine.shouldUpdate()) {
        slotMachine.update(this.mouseWorldPosition);
        shouldUpdate = true;
      }
    }



    if (shouldUpdate) {
      this.render();
    }
  }

  removeSlotMachine(slotMachine: SlotMachine): void {
    const index = this.slotMachines.indexOf(slotMachine);
    if (index !== -1) {
      this.slotMachines.splice(index, 1);
      for (const slot of slotMachine.getSlots()) {
        this.scene.remove(slot.getMesh());
        slot.dispose();
      }
    }
  }

  dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    window.removeEventListener('mousemove', this.onMouseMove.bind(this), false);


    for (const autoMesh of this.autoMeshes) {
        autoMesh.dispose();
        this.scene.remove(autoMesh.getMesh());
    }

    this.autoMeshes = [];

    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }

    this.renderer.dispose();

    this.scene.traverse((object: THREE.Object3D) => {
        const isManagedByAutoMesh = this.autoMeshes.some(am => am.getMesh() === object);
        if ((object as THREE.Mesh).isMesh && !isManagedByAutoMesh) {
             const mesh = object as THREE.Mesh;
             if (mesh.geometry) {
               mesh.geometry.dispose();
             }
             if (mesh.material) {
               disposeMaterial(mesh.material);
             }
        }

        // Dispose of textures on materials of non-AutoMesh objects
        if ((object as any).material && !isManagedByAutoMesh) {
            const materials = Array.isArray((object as any).material) ? (object as any).material : [(object as any).material];
            for (const material of materials) {
                if (material.map && typeof material.map.dispose === 'function') material.map.dispose();
                if (material.lightMap && typeof material.lightMap.dispose === 'function') material.lightMap.dispose();
                if (material.normalMap && typeof material.normalMap.dispose === 'function') material.normalMap.dispose();
                if (material.specularMap && typeof material.specularMap.dispose === 'function') material.specularMap.dispose();
                if (material.envMap && typeof material.envMap.dispose === 'function') material.envMap.dispose();
                if (material.aoMap && typeof material.aoMap.dispose === 'function') material.aoMap.dispose();
                if (material.bumpMap && typeof material.bumpMap.dispose === 'function') material.bumpMap.dispose();
                if (material.displacementMap && typeof material.displacementMap.dispose === 'function') material.displacementMap.dispose();
                if (material.emissiveMap && typeof material.emissiveMap.dispose === 'function') material.emissiveMap.dispose();
                if (material.metalnessMap && typeof material.metalnessMap.dispose === 'function') material.metalnessMap.dispose();
                if (material.roughnessMap && typeof material.roughnessMap.dispose === 'function') material.roughnessMap.dispose();
            }
        }
    });
  }
}

export default ThreeScene;
