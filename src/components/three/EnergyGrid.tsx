import { useMemo, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface GridLine {
  points: THREE.Vector3[];
  speed: number;
  offset: number;
}

const HORIZONTAL_LINES = 20;
const VERTICAL_LINES = 30;

export function EnergyGrid() {
  const { size } = useThree();
  const linesRef = useRef<GridLine[]>([]);
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);

  // Calculate world bounds based on viewport
  const worldBounds = useMemo(() => {
    const baseZoom = 50;
    return {
      halfW: size.width / baseZoom / 2 + 6,
      halfH: size.height / baseZoom / 2 + 6,
    };
  }, [size.width, size.height]);

  // Initialize grid lines
  useEffect(() => {
    const { halfW, halfH } = worldBounds;
    const allLines: GridLine[] = [];

    // Horizontal lines
    for (let i = 0; i < HORIZONTAL_LINES; i++) {
      const y = (i / HORIZONTAL_LINES - 0.5) * halfH * 2;
      allLines.push({
        points: [new THREE.Vector3(-halfW, y, -2.5), new THREE.Vector3(halfW, y, -2.5)],
        speed: 0.5 + Math.random() * 0.5,
        offset: Math.random() * Math.PI * 2,
      });
    }

    // Vertical lines
    for (let i = 0; i < VERTICAL_LINES; i++) {
      const x = (i / VERTICAL_LINES - 0.5) * halfW * 2;
      allLines.push({
        points: [new THREE.Vector3(x, -halfH, -2.5), new THREE.Vector3(x, halfH, -2.5)],
        speed: 0.3 + Math.random() * 0.4,
        offset: Math.random() * Math.PI * 2,
      });
    }

    linesRef.current = allLines;
  }, [worldBounds]);

  // Create memoized line data for rendering
  const lineData = useMemo(() => {
    const { halfW, halfH } = worldBounds;
    const result: { positions: Float32Array; speed: number; offset: number }[] = [];

    // Horizontal lines
    for (let i = 0; i < HORIZONTAL_LINES; i++) {
      const y = (i / HORIZONTAL_LINES - 0.5) * halfH * 2;
      result.push({
        positions: new Float32Array([-halfW, y, -2.5, halfW, y, -2.5]),
        speed: 0.5 + (i / HORIZONTAL_LINES) * 0.5,
        offset: (i / HORIZONTAL_LINES) * Math.PI * 2,
      });
    }

    // Vertical lines
    for (let i = 0; i < VERTICAL_LINES; i++) {
      const x = (i / VERTICAL_LINES - 0.5) * halfW * 2;
      result.push({
        positions: new Float32Array([x, -halfH, -2.5, x, halfH, -2.5]),
        speed: 0.3 + (i / VERTICAL_LINES) * 0.4,
        offset: (i / VERTICAL_LINES) * Math.PI * 2,
      });
    }

    return result;
  }, [worldBounds]);

  useFrame((_, delta) => {
    timeRef.current += delta;
    if (!groupRef.current) return;

    const children = groupRef.current.children;

    for (let i = 0; i < lineData.length; i++) {
      const line = children[i] as THREE.Line;
      if (!line) continue;

      const data = lineData[i];

      // Pulsing opacity effect
      const pulse = (Math.sin(timeRef.current * data.speed + data.offset) + 1) / 2;
      const material = line.material as THREE.LineBasicMaterial;
      material.opacity = 0.03 + pulse * 0.06;
    }
  });

  return (
    <group ref={groupRef}>
      {lineData.map((line, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[line.positions, 3]} />
          </bufferGeometry>
          <lineBasicMaterial color="#2244aa" transparent opacity={0.05} depthWrite={false} />
        </line>
      ))}
    </group>
  );
}
