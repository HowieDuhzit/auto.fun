import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import ThreeScene from './three/scene';
import { BoxMesh } from './three/mesh/boxMesh';
import { EyeMesh } from './three/mesh/eyeMesh';
import { SlotMesh } from './three/mesh/slotMesh';
import SlotMachine from './three/slot/SlotMachine';
import { IToken } from '@/types';

export default function ThreeHeader({headerTokens}: { headerTokens: IToken[] }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const threeSceneRef = useRef<ThreeScene | null>(null);
    const boxMeshRef = useRef<BoxMesh | null>(null);
    const eyeMeshRef = useRef<EyeMesh | null>(null);
    const slotMeshRef = useRef<SlotMachine[] | null>(null);

    const handleClick = () => {
        for (const slotMachine of slotMeshRef.current || []) {
            slotMachine.startAnimation();
        }
    }

    useEffect(() => {
        console.log("headerTokens", headerTokens);
        const currentScene = threeSceneRef.current;
        if (!headerTokens || headerTokens.length === 0 || !currentScene) {
            return;
        }
    
        const slotMachine1 = new SlotMachine(headerTokens, 2.5, new THREE.Vector3(-13, 2.8, 0));
        const slotMachine2 = new SlotMachine(headerTokens, 2.5, new THREE.Vector3(8, 2.8, 0));
        const machinesToAdd = [slotMachine1, slotMachine2];
    
        machinesToAdd.forEach(machine => currentScene.addSlotMachine(machine));
        slotMeshRef.current = machinesToAdd;
    
        return () => {
            if (currentScene) {
                 machinesToAdd.forEach(machine => currentScene.removeSlotMachine(machine));
            }
            slotMeshRef.current = null;
        };
    
    }, [headerTokens]);


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

            threeSceneRef.current.addEyeMesh(eyeMesh1);
            threeSceneRef.current.addEyeMesh(eyeMesh2);

            threeScene.setInteractionPlaneZ(worldPosition1.z);
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
