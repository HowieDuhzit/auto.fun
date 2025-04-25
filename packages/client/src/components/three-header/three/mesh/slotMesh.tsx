import { AutoMesh } from "./automesh";
import * as THREE from "three";


export class SlotMesh extends AutoMesh {
    private initialPosition: THREE.Vector3;
    private isAnimating: boolean = true;
    private animationSpeed: number = 0;
    private texture: THREE.Texture | null = null;

    constructor(slotSize: number, materials: THREE.Material[], initialPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0)) {
        const geometry = new THREE.BoxGeometry(slotSize, slotSize, slotSize, 4 ,4 ,4);
        super(geometry, materials, initialPosition);
        this.initialPosition = initialPosition.clone();
    }

    shouldUpdate(): boolean {
        if (this.firstRender) {
            this.firstRender = false;
            return true;
        } else if (this.isAnimating) {
            return true;
        }
        return false;
    }


    update(mouseWorldPosition: THREE.Vector3): void {
        if (this.isAnimating) {
            this.mesh.rotation.x += this.animationSpeed;
        }
    }

    startAnimation(): void {
        this.isAnimating = true;
    }

    stopAnimation(): void {
        this.isAnimating = false;
    }

    getRotation(): THREE.Euler {
        return this.mesh.rotation;
    }

    setAnimationSpeed(speed: number): void {
        this.animationSpeed = speed;
    }

    getAnimationSpeed(): number {
        return this.animationSpeed;
    }

    setRotation(rotation: THREE.Euler): void {
        this.mesh.rotation.copy(rotation);
    }

    Animating(): boolean {
        return this.isAnimating;
    }
}