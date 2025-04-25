import { SlotMesh } from "../mesh/slotMesh";
import * as THREE from "three";

export default class SlotMachine {
    private slots: SlotMesh[] = [];
    private position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
    private slotSizes: number = 0.5;
    private isFirstRender: boolean = true;
    private slotGap: number = 0.1; // Gap between slots
    private animationSpeed: number = 0;
    private straighteningPhase: boolean = false;
    private straighteningTargets: number[] = [];
    private readonly straighteningThreshold: number = 0.1; // Speed below which straightening starts
    private readonly straighteningLerpFactor: number = 0.1;
    private readonly snapThreshold: number = 0.005;

    constructor(slotSize: number = 1.2, position: THREE.Vector3 = new THREE.Vector3(0, 0, 0)) {
        this.position = position;
        this.slotSizes = slotSize + this.slotGap; // Adjust slot size to include gap
        for (let i = 0; i < 3; i++) {
            const slotMesh = new SlotMesh(this.slotSizes, new THREE.Color(0x000000), new THREE.Vector3(this.position.x + (i * this.slotSizes + i * this.slotGap), this.position.y, this.position.z));
            this.slots.push(slotMesh);
        }
    }

    getSlots(): SlotMesh[] {
        return this.slots;
    }

    shouldUpdate(): boolean {
        if (this.isFirstRender) {
            this.isFirstRender = false;
            return true;
        }
        return this.animationSpeed > 0 || this.straighteningPhase;
    }

    startAnimation(): void {
        this.animationSpeed = 0.7;
        this.straighteningPhase = false;
        this.straighteningTargets = [];
        for (const slot of this.slots) {
            slot.setAnimationSpeed(this.animationSpeed);
            slot.startAnimation();
        }
    }

    isAnimating(): boolean {
        return this.animationSpeed > 0 || this.straighteningPhase;
    }

    update(mousePosition: THREE.Vector3): void {
        if (this.animationSpeed === 0 && !this.straighteningPhase) {
            return;
        }

        if (!this.straighteningPhase) {
            const decayRate = 0.005;
            this.animationSpeed *= (1 - decayRate);

            for (const slot of this.slots) {
                slot.setAnimationSpeed(this.animationSpeed);
                slot.update(mousePosition);
            }

            if (this.animationSpeed < this.straighteningThreshold) {
                this.startStraighteningPhase();
            }
        }
        else {
            let allSlotsStraight = true;

            for (let i = 0; i < this.slots.length; i++) {
                const slot = this.slots[i];
                const targetRotationX = this.straighteningTargets[i];
                const currentRotation = slot.getRotation();

                let diffX = targetRotationX - currentRotation.x;

                while (diffX < -Math.PI) diffX += 2 * Math.PI;
                while (diffX > Math.PI) diffX -= 2 * Math.PI;

                if (Math.abs(diffX) < this.snapThreshold) {
                    slot.setRotation(new THREE.Euler(targetRotationX, currentRotation.y, currentRotation.z));
                } else {
                    allSlotsStraight = false;
                    const newRotationX = currentRotation.x + diffX * this.straighteningLerpFactor;
                    slot.setRotation(new THREE.Euler(newRotationX, currentRotation.y, currentRotation.z));
                }
            }

            if (allSlotsStraight) {
                this.straighteningPhase = false;
                this.straighteningTargets = [];
                 for (const slot of this.slots) {
                    slot.stopAnimation();
                 }
            }
        }
    }

    private startStraighteningPhase(): void {
        this.straighteningPhase = true;
        this.animationSpeed = 0;
        this.straighteningTargets = [];

        for (const slot of this.slots) {
            slot.setAnimationSpeed(0);

            const currentRotationX = slot.getRotation().x;
            const targetRotationX = Math.round(currentRotationX / (Math.PI / 2)) * (Math.PI / 2);
            this.straighteningTargets.push(targetRotationX);
        }
    }
}