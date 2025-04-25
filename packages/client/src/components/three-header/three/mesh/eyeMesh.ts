import * as THREE from 'three';
import { AutoMesh } from './automesh';

export class EyeMesh extends AutoMesh {
    private followRadius: number;
    private eyeRadius: number;
    private initialPosition: THREE.Vector3;

    constructor(radius: number, color: THREE.ColorRepresentation, followRadius: number, initialPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0)) {
        const geometry = new THREE.CircleGeometry(radius, 32);
        const material = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });

        super(geometry, material, initialPosition);

        this.eyeRadius = radius;
        this.followRadius = followRadius;
        this.initialPosition = initialPosition.clone();
    }

    // Override the update method to make the eye follow the mouse, math stuff
    update(mouseWorldPosition: THREE.Vector3): void {

        if (mouseWorldPosition.equals(new THREE.Vector3(0, 0, 0))) {
            return;
        }
        
        const direction = mouseWorldPosition.clone().sub(this.initialPosition);

        direction.clampLength(0, this.followRadius);
        
        const newPosition = this.initialPosition.clone().add(direction);
        this.mesh.position.copy(newPosition);

    }
}
