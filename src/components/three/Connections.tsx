import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Country } from '@/types/game';
import { getFactionColor } from '@/types/game';
import { getCountryOwner } from '@/game/battle';
import { hexToPixel, hexNeighbors, hexKey } from '@/game/hex';
import { useGameStore } from '@/store/gameStore';
import { Line } from '@react-three/drei';

interface ConnectionsProps {
  countries: Country[];
  size: number;
}

interface Connection {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
}

export function Connections({ countries, size }: ConnectionsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const pulseTimeRef = useRef(0);
  const localFactionId = useGameStore((s) => s.local.factionId);

  const connections = useMemo(() => {
    const result: Connection[] = [];
    const countryMap = new Map(countries.map((c) => [hexKey(c.coords), c]));
    const processedPairs = new Set<string>();

    for (const country of countries) {
      const owner = getCountryOwner(country);
      if (owner === 'neutral') continue;

      const neighbors = hexNeighbors(country.coords);
      for (const neighborCoord of neighbors) {
        const neighbor = countryMap.get(hexKey(neighborCoord));
        if (!neighbor) continue;

        const neighborOwner = getCountryOwner(neighbor);
        if (neighborOwner !== owner) continue;

        // Avoid duplicate connections
        const pairKey = [hexKey(country.coords), hexKey(neighborCoord)].sort().join('-');
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        const from = hexToPixel(country.coords, size);
        const to = hexToPixel(neighborCoord, size);
        const color = getFactionColor(owner);

        result.push({ from, to, color });
      }
    }

    return result;
  }, [countries, size, localFactionId]);

  const opacityRef = useRef(0.5);

  useFrame((_, delta) => {
    pulseTimeRef.current += delta;
    opacityRef.current = ((Math.sin(pulseTimeRef.current * 1.5) + 1) / 2) * 0.3 + 0.4;
  });

  if (connections.length === 0) return null;

  return (
    <group ref={groupRef}>
      {connections.map((conn, i) => {
        const points: [number, number, number][] = [
          [conn.from.x, conn.from.y, -0.05],
          [conn.to.x, conn.to.y, -0.05],
        ];

        return (
          <group key={i}>
            {/* Outer glow */}
            <Line points={points} color={conn.color} lineWidth={4} transparent opacity={0.4} />
            {/* Inner bright core */}
            <Line points={points} color={conn.color} lineWidth={2} transparent opacity={0.8} />
          </group>
        );
      })}
    </group>
  );
}
