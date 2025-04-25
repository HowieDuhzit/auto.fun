import * as THREE from 'three';

export abstract class AutoMesh {
    protected geometry: THREE.BufferGeometry;
    protected material: THREE.Material | THREE.Material[];
    protected mesh: THREE.Mesh;
    protected firstRender: boolean = true;

    constructor(geometry: THREE.BufferGeometry, material: THREE.Material | THREE.Material[], position: THREE.Vector3 = new THREE.Vector3(0, 0, 0)) {
        this.geometry = geometry;
        this.material = material;
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.position.copy(position);
    }

    getMesh(): THREE.Mesh {
        return this.mesh;
    }

    abstract update(mousePosition: THREE.Vector3): void;

    dispose(): void {
        if (this.geometry) {
            this.geometry.dispose();
        }
        if (this.material) {
            if (Array.isArray(this.material)) {
                this.material.forEach((mat) => mat.dispose());
            } else {
                this.material.dispose();
            }
        }
    }
}
