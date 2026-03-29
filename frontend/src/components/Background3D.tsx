import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Smooth global mouse (window-level, bypasses pointer-events-none)
const mouse = { x: 0, y: 0, smoothX: 0, smoothY: 0 };

function FloatingOrb({ basePos, radius, color, speed }: { basePos: [number, number, number], radius: number, color: string, speed: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_state) => {
    if (!meshRef.current) return;
    const t = _state.clock.getElapsedTime();

    // Gentle orbit path
    meshRef.current.position.x = basePos[0] + Math.sin(t * speed * 0.4) * 1.5;
    meshRef.current.position.y = basePos[1] + Math.cos(t * speed * 0.3) * 1.2;
    meshRef.current.position.z = basePos[2] + Math.sin(t * speed * 0.2) * 0.5;

    // Smooth parallax drift toward cursor
    meshRef.current.position.x += mouse.smoothX * (basePos[2] + 12) * 0.15;
    meshRef.current.position.y += mouse.smoothY * (basePos[2] + 12) * 0.15;

    // Very slow rotation
    meshRef.current.rotation.x = t * speed * 0.1;
    meshRef.current.rotation.z = t * speed * 0.08;
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[radius, 64, 64]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.18}
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  );
}

function Scene() {
  const orbs = useMemo(() => [
    { pos: [-6, 4, -4] as [number, number, number], r: 3.5, color: '#6366F1', speed: 0.7 },
    { pos: [7, -3, -6] as [number, number, number], r: 4.5, color: '#8B5CF6', speed: 0.5 },
    { pos: [-4, -5, -8] as [number, number, number], r: 5, color: '#A78BFA', speed: 0.4 },
    { pos: [5, 6, -3] as [number, number, number], r: 2.5, color: '#C4B5FD', speed: 0.9 },
    { pos: [-8, 0, -10] as [number, number, number], r: 6, color: '#818CF8', speed: 0.3 },
    { pos: [2, -7, -5] as [number, number, number], r: 3, color: '#6366F1', speed: 0.6 },
  ], []);

  // Smooth the mouse each frame
  useFrame(() => {
    mouse.smoothX += (mouse.x - mouse.smoothX) * 0.03;
    mouse.smoothY += (mouse.y - mouse.smoothY) * 0.03;
  });

  return (
    <>
      <ambientLight intensity={1.2} />
      <directionalLight position={[10, 10, 5]} intensity={0.5} color="#E0E7FF" />
      {orbs.map((o, i) => (
        <FloatingOrb key={i} basePos={o.pos} radius={o.r} color={o.color} speed={o.speed} />
      ))}
    </>
  );
}

export default function Background3D() {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none" style={{ background: 'linear-gradient(160deg, #F8FAFF 0%, #EEF2FF 40%, #E0E7FF 100%)' }}>
      <Canvas camera={{ position: [0, 0, 12], fov: 50 }}>
        <Scene />
      </Canvas>
    </div>
  );
}
