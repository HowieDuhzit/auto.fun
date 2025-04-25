import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import ThreeScene from './three/scene';
import { BoxMesh } from './three/mesh/boxMesh';
import { EyeMesh } from './three/mesh/eyeMesh';
import { SlotMesh } from './three/mesh/slotMesh';
import SlotMachine from './three/slot/SlotMachine';

export default function ThreeHeader() {
    const containerRef = useRef<HTMLDivElement>(null);
    const threeSceneRef = useRef<ThreeScene | null>(null);
    const boxMeshRef = useRef<BoxMesh | null>(null);
    const eyeMeshRef = useRef<EyeMesh | null>(null);
    const slotMeshRef = useRef<SlotMachine | null>(null);

    const handleClick = () => {
        if (slotMeshRef.current) {
            slotMeshRef.current.startAnimation();
        }
    }


    useEffect(() => {
        if (containerRef.current) {
            const threeScene = new ThreeScene(containerRef.current);
            threeSceneRef.current = threeScene;


            const worldPosition1 = new THREE.Vector3(4.8,-1.5,0);
            const worldPosition2 = new THREE.Vector3(-4.4,-1.4,0);

            const eyeSize = 0.4;
            const followRadius = 1;
            const eyeMesh1 = new EyeMesh(eyeSize, new THREE.Color(0x000000), followRadius, worldPosition1);
            const eyeMesh2 = new EyeMesh(eyeSize, new THREE.Color(0x000000), followRadius, worldPosition2);
            const slotMachine = new SlotMachine(2);

            threeSceneRef.current.addEyeMesh(eyeMesh1);
            threeSceneRef.current.addEyeMesh(eyeMesh2);
            threeSceneRef.current.addSlotMachine(slotMachine);

            threeScene.setInteractionPlaneZ(worldPosition1.z);

            slotMeshRef.current = slotMachine;

            const handleResize = () => {
                if (containerRef.current && threeSceneRef.current) {
                    threeSceneRef.current.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
                }
            };

            window.addEventListener('resize', handleResize);

            return () => {
                window.removeEventListener('resize', handleResize);

                if (threeSceneRef.current) {
                    threeSceneRef.current.dispose();
                    threeSceneRef.current = null;
                }
                boxMeshRef.current = null;
                eyeMeshRef.current = null;
            };
        }

    }, []);

    return (
        <div
            onClick={handleClick}
            ref={containerRef}
            className='w-full h-[300px] relative overflow-hidden'
        >
            <div className='w-full h-full flex justify-center items-center'>
                <img
                    src="noeyes.svg"
                    className="h-full object-contain"
                    style={{ aspectRatio: "3/1" }}
                    alt="Face background"
                />
            </div>
        </div>
    );
}
