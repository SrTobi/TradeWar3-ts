import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Country, HexCoord } from '@/types/game';
import { getFactionColor } from '@/types/game';
import { getCountryOwner } from '@/game/battle';
import { hexToPixel } from '@/game/hex';
import { uiStore } from '@/store/uiStore';
import { Text } from '@react-three/drei';

interface HexProps {
  country: Country;
  defenseBonus: number;
  localFactionId: string | null;
  hoveredHex: HexCoord | null;
  size: number;
  onClick: () => void;
}

function lighten(color: THREE.Color, amount: number): THREE.Color {
  return new THREE.Color(
    Math.min(1, color.r + amount),
    Math.min(1, color.g + amount),
    Math.min(1, color.b + amount)
  );
}

function darken(color: THREE.Color, amount: number): THREE.Color {
  return new THREE.Color(
    Math.max(0, color.r - amount),
    Math.max(0, color.g - amount),
    Math.max(0, color.b - amount)
  );
}

// Get contrasting text color based on background brightness
function getContrastColor(bgColor: THREE.Color): string {
  const luminance = 0.299 * bgColor.r + 0.587 * bgColor.g + 0.114 * bgColor.b;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

// Create rounded rectangle shape
function createRoundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;

  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);

  return shape;
}

export function Hex({ country, defenseBonus, localFactionId, hoveredHex, size, onClick }: HexProps) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRingsRef = useRef<THREE.Group>(null);
  const innerHighlightRef = useRef<THREE.LineLoop>(null);
  const pulseTimeRef = useRef(Math.random() * Math.PI * 2);

  const owner = getCountryOwner(country);
  const isHovered = hoveredHex?.q === country.coords.q && hoveredHex?.r === country.coords.r;
  const isNeutral = owner === 'neutral';

  const handlePointerEnter = () => uiStore.setHoveredHex(country.coords);
  const handlePointerLeave = () => uiStore.setHoveredHex(null);

  const position = useMemo(() => {
    const { x, y } = hexToPixel(country.coords, size);
    return [x, y, 0] as [number, number, number];
  }, [country.coords.q, country.coords.r, size]);

  const baseColor = useMemo(() => new THREE.Color(getFactionColor(owner)), [owner]);

  // Hex vertices for flat-top orientation
  const hexVertices = useMemo(() => {
    const verts: THREE.Vector2[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      verts.push(new THREE.Vector2(size * 0.95 * Math.cos(angle), size * 0.95 * Math.sin(angle)));
    }
    return verts;
  }, [size]);

  // Gradient hex shape (6 triangular wedges with center-to-edge gradient)
  const hexGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];

    const hoverBoost = isHovered ? 0.15 : 0;
    const centerColor = lighten(baseColor, 0.2 + hoverBoost);
    const edgeColor = darken(baseColor, 0.15);

    for (let i = 0; i < 6; i++) {
      const v1 = hexVertices[i];
      const v2 = hexVertices[(i + 1) % 6];

      // Triangle: center, v1, v2
      positions.push(0, 0, 0);
      positions.push(v1.x, v1.y, 0);
      positions.push(v2.x, v2.y, 0);

      // Colors: center bright, edges darker
      colors.push(centerColor.r, centerColor.g, centerColor.b);
      colors.push(edgeColor.r, edgeColor.g, edgeColor.b);
      colors.push(edgeColor.r, edgeColor.g, edgeColor.b);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return geometry;
  }, [hexVertices, baseColor, isHovered]);

  // Inner highlight ring (70% size)
  const innerRingGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 6; i++) {
      const angle = (Math.PI / 3) * (i % 6);
      points.push(
        new THREE.Vector3(size * 0.6 * Math.cos(angle), size * 0.6 * Math.sin(angle), 0.02)
      );
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [size]);

  // Border geometry
  const borderGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 6; i++) {
      const angle = (Math.PI / 3) * (i % 6);
      points.push(
        new THREE.Vector3(size * 0.95 * Math.cos(angle), size * 0.95 * Math.sin(angle), 0.01)
      );
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [size]);

  // Glow ring geometries (3 concentric rings)
  const glowRingGeometries = useMemo(() => {
    return [0, 1, 2].map((ring) => {
      const ringSize = size * (1.0 + ring * 0.1);
      const shape = new THREE.Shape();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const x = ringSize * Math.cos(angle);
        const y = ringSize * Math.sin(angle);
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      shape.closePath();
      return new THREE.ShapeGeometry(shape);
    });
  }, [size]);

  // Rounded badge geometry
  const badgeGeometry = useMemo(() => {
    const shape = createRoundedRectShape(size * 0.7, size * 0.35, size * 0.08);
    return new THREE.ShapeGeometry(shape);
  }, [size]);

  const badgeShadowGeometry = useMemo(() => {
    const shape = createRoundedRectShape(size * 0.7, size * 0.35, size * 0.08);
    return new THREE.ShapeGeometry(shape);
  }, [size]);

  // Smaller defense bonus badge geometry
  const defenseBadgeGeometry = useMemo(() => {
    const shape = createRoundedRectShape(size * 0.55, size * 0.28, size * 0.06);
    return new THREE.ShapeGeometry(shape);
  }, [size]);

  useFrame((_, delta) => {
    pulseTimeRef.current += delta;
    const pulseTime = pulseTimeRef.current;

    // Update glow rings with pulsing
    if (glowRingsRef.current && !isNeutral) {
      const glowPulse = ((Math.sin(pulseTime * 2) + 1) / 2) * 0.2 + 0.15;
      glowRingsRef.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = glowPulse * (1 - i * 0.25);
      });
    }

    // Update inner highlight
    if (innerHighlightRef.current) {
      const mat = innerHighlightRef.current.material as THREE.LineBasicMaterial;
      const highlightColor = lighten(baseColor, 0.4);
      mat.color = highlightColor;
      mat.opacity = isNeutral ? 0.15 : 0.4;
    }
  });

  const unitEntries = Object.entries(country.units).filter(([, n]) => n > 0);
  const borderColor = isHovered ? new THREE.Color('#ffffff') : darken(baseColor, 0.3);

  return (
    <group ref={groupRef} position={position}>
      {/* Glow rings (behind main hex) */}
      {!isNeutral && (
        <group ref={glowRingsRef} position={[0, 0, -0.1]}>
          {glowRingGeometries.map((geo, i) => (
            <mesh key={i} geometry={geo}>
              <meshBasicMaterial
                color={baseColor}
                transparent
                opacity={0.2 * (1 - i * 0.25)}
                depthWrite={false}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* Main hex with gradient */}
      <mesh
        geometry={hexGeometry}
        onClick={onClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        <meshBasicMaterial vertexColors transparent opacity={isHovered ? 1.0 : 0.9} />
      </mesh>

      {/* Border */}
      <lineLoop geometry={borderGeometry}>
        <lineBasicMaterial color={borderColor} linewidth={isHovered ? 3 : 2} />
      </lineLoop>

      {/* Inner highlight */}
      <lineLoop ref={innerHighlightRef} geometry={innerRingGeometry}>
        <lineBasicMaterial color={lighten(baseColor, 0.4)} transparent opacity={0.4} />
      </lineLoop>

      {/* Unit count badges */}
      {unitEntries.length > 0 && (
        <group position={[0, 0, 0.1]}>
          {unitEntries.map(([factionId, count], idx) => {
            const badgeColor = new THREE.Color(getFactionColor(factionId));
            const textColor = getContrastColor(badgeColor);
            // Shift badges up when defense bonus is displayed
            const defenseOffset = defenseBonus > 0 ? size * 0.15 : 0;
            const yOffset =
              ((unitEntries.length - 1) / 2) * size * 0.4 - idx * size * 0.4 + defenseOffset;

            return (
              <group key={factionId} position={[0, yOffset, 0]}>
                {/* Badge background shadow */}
                <mesh geometry={badgeShadowGeometry} position={[size * 0.02, -size * 0.02, -0.01]}>
                  <meshBasicMaterial color="#000000" transparent opacity={0.4} />
                </mesh>
                {/* Badge background */}
                <mesh geometry={badgeGeometry}>
                  <meshBasicMaterial color={badgeColor} />
                </mesh>
                {/* Badge border highlight */}
                <mesh geometry={badgeGeometry} position={[0, 0, 0.005]}>
                  <meshBasicMaterial
                    color={lighten(badgeColor, 0.3)}
                    transparent
                    opacity={0.5}
                    wireframe
                  />
                </mesh>
                {/* Unit count text */}
                <Text
                  position={[0, 0, 0.02]}
                  fontSize={size * 0.28}
                  color={textColor}
                  anchorX="center"
                  anchorY="middle"
                  fontWeight="bold"
                  outlineWidth={size * 0.015}
                  outlineColor={textColor === '#ffffff' ? '#000000' : '#ffffff'}
                >
                  {count}
                </Text>
              </group>
            );
          })}
        </group>
      )}

      {/* Defense bonus badge - shows territorial advantage for local player in contested territories */}
      {defenseBonus > 0 && localFactionId && (
        <group position={[0, -size * 0.32, 0.1]}>
          {/* Badge background shadow */}
          <mesh geometry={defenseBadgeGeometry} position={[size * 0.015, -size * 0.015, -0.01]}>
            <meshBasicMaterial color="#000000" transparent opacity={0.4} />
          </mesh>
          {/* Badge background - use local player's faction color */}
          <mesh geometry={defenseBadgeGeometry}>
            <meshBasicMaterial
              color={darken(new THREE.Color(getFactionColor(localFactionId)), 0.2)}
            />
          </mesh>
          {/* Badge border highlight */}
          <mesh geometry={defenseBadgeGeometry} position={[0, 0, 0.005]}>
            <meshBasicMaterial
              color={lighten(new THREE.Color(getFactionColor(localFactionId)), 0.1)}
              transparent
              opacity={0.5}
              wireframe
            />
          </mesh>
          {/* Defense bonus text */}
          <Text
            position={[0, 0, 0.02]}
            fontSize={size * 0.18}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            fontWeight="bold"
            outlineWidth={size * 0.012}
            outlineColor="#000000"
          >
            +{Math.round(defenseBonus * 100)}%
          </Text>
        </group>
      )}
    </group>
  );
}
