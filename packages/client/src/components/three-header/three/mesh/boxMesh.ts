import { AutoMesh } from "./automesh";
import * as THREE from "three";


// just for testing

export class BoxMesh extends AutoMesh {
    constructor(size: number, color: number) {
        const geometry = new THREE.BoxGeometry(size, size, size);
        const material = new THREE.MeshStandardMaterial({ color });
        super(geometry, material, new THREE.Vector3(0, 0, 0));
    }

    update(): void {
        this.mesh.rotation.x += 0.01;
        this.mesh.rotation.y += 0.01;
        this.mesh.rotation.z += 0.01;
    }
}