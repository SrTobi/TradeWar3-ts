import { useMemo, useRef } from 'react';
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
  const horizontalLinesRef = useRef<GridLine[]>([]);
  const verticalLinesRef = useRef<GridLine[]>([]);
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
  useMemo(() => {
    const { halfW, halfH } = worldBounds;

    // Horizontal lines
    const hLines: GridLine[] = [];
    for (let i = 0; i < HORIZONTAL_LINES; i++) {
      const y = (i / HORIZONTAL_LINES - 0.5) * halfH * 2;
      hLines.push({
        points: [new THREE.Vector3(-halfW, y, -2.5), new THREE.Vector3(halfW, y, -2.5)],
        speed: 0.5 + Math.random() * 0.5,
        offset: Math.random() * Math.PI * 2,
      });
    }
    horizontalLinesRef.current = hLines;

    // Vertical lines
    const vLines: GridLine[] = [];
    for (let i = 0; i < VERTICAL_LINES; i++) {
      const x = (i / VERTICAL_LINES - 0.5) * halfW * 2;
      vLines.push({
        points: [new THREE.Vector3(x, -halfH, -2.5), new THREE.Vector3(x, halfH, -2.5)],
        speed: 0.3 + Math.random() * 0.4,
        offset: Math.random() * Math.PI * 2,
      });
    }
    verticalLinesRef.current = vLines;
  }, [worldBounds]);

  useFrame((_, delta) => {
    timeRef.current += delta;
    if (!groupRef.current) return;

    const children = groupRef.current.children;
    const totalLines = horizontalLinesRef.current.length + verticalLinesRef.current.length;

    for (let i = 0; i < totalLines; i++) {
      const line = children[i] as THREE.Line;
      if (!line) continue;

      const isHorizontal = i < horizontalLinesRef.current.length;
      const lineData = isHorizontal
        ? horizontalLinesRef.current[i]
        : verticalLinesRef.current[i - horizontalLinesRef.current.length];

      // Pulsing opacity effect
      const pulse = (Math.sin(timeRef.current * lineData.speed + lineData.offset) + 1) / 2;
      const material = line.material as THREE.LineBasicMaterial;
      material.opacity = 0.03 + pulse * 0.06;
    }
  });

  const allLines = [...horizontalLinesRef.current, ...verticalLinesRef.current];

  return (
    <group ref={groupRef}>
      {allLines.map((line, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array(line.points.flatMap((p) => [p.x, p.y, p.z])), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#2244aa" transparent opacity={0.05} depthWrite={false} />
        </line>
      ))}
    </group>
  );
}
