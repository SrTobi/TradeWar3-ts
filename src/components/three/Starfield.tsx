import { useMemo, useRef, useEffect, type ReactElement } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
  color: THREE.Color;
  brightness: number;
  twinklePhase: number;
  twinkleSpeed: number;
  hasGlow: boolean;
}

interface Nebula {
  x: number;
  y: number;
  radius: number;
  color: THREE.Color;
  alpha: number;
  speed: number;
}

interface ShootingStar {
  x: number;
  y: number;
  angle: number;
  speed: number;
  life: number;
  maxLife: number;
  active: boolean;
}

const STAR_COUNT = 300;
const NEBULA_COUNT = 8;
const NEBULA_LAYERS = 5;

// Star colors from original
function getStarColor(): THREE.Color {
  const roll = Math.random();
  if (roll < 0.5) {
    // White-blue
    return new THREE.Color(0.9 + Math.random() * 0.1, 0.9 + Math.random() * 0.1, 1.0);
  } else if (roll < 0.75) {
    // Blue
    return new THREE.Color(0.7 + Math.random() * 0.3, 0.8 + Math.random() * 0.2, 1.0);
  } else if (roll < 0.9) {
    // Yellow
    return new THREE.Color(1.0, 1.0, 0.7 + Math.random() * 0.3);
  } else {
    // Orange
    return new THREE.Color(1.0, 0.7 + Math.random() * 0.2, 0.5 + Math.random() * 0.2);
  }
}

// Nebula colors from original
const NEBULA_COLORS = [
  { r: 0.2, g: 0.1, b: 0.4, a: 0.15 }, // Purple
  { r: 0.1, g: 0.2, b: 0.4, a: 0.12 }, // Deep blue
  { r: 0.3, g: 0.1, b: 0.2, a: 0.1 }, // Magenta
  { r: 0.1, g: 0.3, b: 0.3, a: 0.08 }, // Teal
  { r: 0.4, g: 0.2, b: 0.1, a: 0.1 }, // Orange-brown
];

export function Starfield() {
  const { size } = useThree();
  const starsRef = useRef<Star[]>([]);
  const nebulasRef = useRef<Nebula[]>([]);
  const shootingStarRef = useRef<ShootingStar>({
    x: 0,
    y: 0,
    angle: 0,
    speed: 0,
    life: 0,
    maxLife: 0,
    active: false,
  });
  const nextShootingStarRef = useRef(2 + Math.random() * 4);

  const starMeshRef = useRef<THREE.InstancedMesh>(null);
  const starGlowMeshRef = useRef<THREE.InstancedMesh>(null);
  const nebulaGroupRef = useRef<THREE.Group>(null);
  const shootingStarGroupRef = useRef<THREE.Group>(null);

  // Calculate world bounds based on viewport
  const worldBounds = useMemo(() => {
    // Estimate world size based on typical zoom (will be updated)
    const baseZoom = 50;
    return {
      halfW: size.width / baseZoom / 2 + 2,
      halfH: size.height / baseZoom / 2 + 2,
    };
  }, [size.width, size.height]);

  // Initialize stars
  useEffect(() => {
    const { halfW, halfH } = worldBounds;
    const stars: Star[] = [];

    for (let i = 0; i < STAR_COUNT; i++) {
      const layer = Math.random();
      let speed: number, starSize: number;

      if (layer < 0.5) {
        // Far layer: slow, small
        speed = 0.1 + Math.random() * 0.15;
        starSize = 0.02 + Math.random() * 0.015;
      } else if (layer < 0.8) {
        // Mid layer
        speed = 0.25 + Math.random() * 0.25;
        starSize = 0.03 + Math.random() * 0.02;
      } else {
        // Close layer: fast, large
        speed = 0.5 + Math.random() * 0.5;
        starSize = 0.05 + Math.random() * 0.03;
      }

      stars.push({
        x: (Math.random() - 0.5) * halfW * 2,
        y: (Math.random() - 0.5) * halfH * 2,
        speed,
        size: starSize,
        color: getStarColor(),
        brightness: 0.6 + Math.random() * 0.4,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 1 + Math.random() * 3,
        hasGlow: starSize > 0.05,
      });
    }
    starsRef.current = stars;
  }, [worldBounds]);

  // Initialize nebulas
  useEffect(() => {
    const { halfW, halfH } = worldBounds;
    const nebulas: Nebula[] = [];

    for (let i = 0; i < NEBULA_COUNT; i++) {
      const colorDef = NEBULA_COLORS[Math.floor(Math.random() * NEBULA_COLORS.length)];
      nebulas.push({
        x: (Math.random() - 0.5) * halfW * 2,
        y: (Math.random() - 0.5) * halfH * 2,
        radius: 2 + Math.random() * 2.5,
        color: new THREE.Color(colorDef.r, colorDef.g, colorDef.b),
        alpha: colorDef.a,
        speed: 0.03 + Math.random() * 0.08,
      });
    }
    nebulasRef.current = nebulas;
  }, [worldBounds]);

  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  useFrame((state, delta) => {
    const stars = starsRef.current;
    const nebulas = nebulasRef.current;
    const shootingStar = shootingStarRef.current;

    // Get actual camera bounds
    const camera = state.camera as THREE.OrthographicCamera;
    const actualHalfW = (camera.right - camera.left) / 2 / camera.zoom + 2;
    const actualHalfH = (camera.top - camera.bottom) / 2 / camera.zoom + 2;

    // Update stars
    if (starMeshRef.current && stars.length > 0) {
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];

        // Move star
        star.x -= star.speed * delta;
        if (star.x < -actualHalfW) {
          star.x = actualHalfW;
          star.y = (Math.random() - 0.5) * actualHalfH * 2;
        }

        // Twinkle
        star.twinklePhase += star.twinkleSpeed * delta;
        const twinkle = ((Math.sin(star.twinklePhase) + 1) / 2) * 0.4 + 0.6;
        const brightness = star.brightness * twinkle;

        // Update instance
        tempMatrix.makeScale(star.size, star.size, 1);
        tempMatrix.setPosition(star.x, star.y, -1);
        starMeshRef.current.setMatrixAt(i, tempMatrix);

        tempColor.setRGB(
          star.color.r * brightness,
          star.color.g * brightness,
          star.color.b * brightness
        );
        starMeshRef.current.setColorAt(i, tempColor);

        // Update glow for bright stars
        if (starGlowMeshRef.current && star.hasGlow) {
          tempMatrix.makeScale(star.size * 2.5, star.size * 2.5, 1);
          tempMatrix.setPosition(star.x, star.y, -1.01);
          starGlowMeshRef.current.setMatrixAt(i, tempMatrix);
          tempColor.setRGB(
            star.color.r * brightness * 0.3,
            star.color.g * brightness * 0.3,
            star.color.b * brightness * 0.3
          );
          starGlowMeshRef.current.setColorAt(i, tempColor);
        }
      }
      starMeshRef.current.instanceMatrix.needsUpdate = true;
      if (starMeshRef.current.instanceColor) {
        starMeshRef.current.instanceColor.needsUpdate = true;
      }
      if (starGlowMeshRef.current) {
        starGlowMeshRef.current.instanceMatrix.needsUpdate = true;
        if (starGlowMeshRef.current.instanceColor) {
          starGlowMeshRef.current.instanceColor.needsUpdate = true;
        }
      }
    }

    // Update nebulas
    if (nebulaGroupRef.current && nebulas.length > 0) {
      nebulas.forEach((nebula, i) => {
        nebula.x -= nebula.speed * delta;
        if (nebula.x < -actualHalfW - nebula.radius) {
          nebula.x = actualHalfW + nebula.radius;
          nebula.y = (Math.random() - 0.5) * actualHalfH * 2;
        }

        // Update all layers for this nebula
        const baseIndex = i * NEBULA_LAYERS;
        for (let layer = 0; layer < NEBULA_LAYERS; layer++) {
          const child = nebulaGroupRef.current!.children[baseIndex + layer];
          if (child) {
            child.position.set(nebula.x, nebula.y, -2 - layer * 0.01);
          }
        }
      });
    }

    // Shooting star logic
    nextShootingStarRef.current -= delta;
    if (nextShootingStarRef.current <= 0 && !shootingStar.active) {
      shootingStar.active = true;
      shootingStar.x = actualHalfW + 1;
      shootingStar.y = (Math.random() - 0.5) * actualHalfH * 1.5 + actualHalfH * 0.3;
      shootingStar.angle = 0.2 + Math.random() * 0.5;
      shootingStar.speed = 8 + Math.random() * 6;
      shootingStar.life = 0;
      shootingStar.maxLife = 0.4 + Math.random() * 0.8;
      nextShootingStarRef.current = 2 + Math.random() * 4;
    }

    if (shootingStar.active && shootingStarGroupRef.current) {
      shootingStar.life += delta;
      shootingStar.x -= Math.cos(shootingStar.angle) * shootingStar.speed * delta;
      shootingStar.y -= Math.sin(shootingStar.angle) * shootingStar.speed * delta;

      const progress = shootingStar.life / shootingStar.maxLife;
      const alpha = progress < 0.3 ? progress / 0.3 : (1 - progress) / 0.7;

      shootingStarGroupRef.current.position.set(shootingStar.x, shootingStar.y, -0.5);
      shootingStarGroupRef.current.rotation.z = -shootingStar.angle;
      shootingStarGroupRef.current.visible = true;

      // Update trail opacity
      shootingStarGroupRef.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = alpha * (1 - i * 0.08);
      });

      if (shootingStar.life >= shootingStar.maxLife) {
        shootingStar.active = false;
        shootingStarGroupRef.current.visible = false;
      }
    }
  });

  // Create nebula layers for soft gradient effect
  const nebulaElements = useMemo(() => {
    const elements: ReactElement[] = [];
    const nebulas = nebulasRef.current;

    nebulas.forEach((nebula, i) => {
      for (let layer = 0; layer < NEBULA_LAYERS; layer++) {
        const scale = 1 - layer * 0.15;
        const layerAlpha = nebula.alpha * (1 - layer * 0.2);
        elements.push(
          <mesh key={`${i}-${layer}`} position={[nebula.x, nebula.y, -2 - layer * 0.01]}>
            <circleGeometry args={[nebula.radius * scale, 32]} />
            <meshBasicMaterial
              color={nebula.color}
              transparent
              opacity={layerAlpha}
              depthWrite={false}
            />
          </mesh>
        );
      }
    });
    return elements;
  }, [nebulasRef.current.length > 0]);

  return (
    <group>
      {/* Background color plane */}
      <mesh position={[0, 0, -3]}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial color="#050508" />
      </mesh>

      {/* Nebulas with layered soft effect */}
      <group ref={nebulaGroupRef}>{nebulaElements}</group>

      {/* Star glow layer (for bright stars) */}
      <instancedMesh ref={starGlowMeshRef} args={[undefined, undefined, STAR_COUNT]}>
        <circleGeometry args={[1, 12]} />
        <meshBasicMaterial transparent opacity={0.2} depthWrite={false} />
      </instancedMesh>

      {/* Stars as instanced mesh */}
      <instancedMesh ref={starMeshRef} args={[undefined, undefined, STAR_COUNT]}>
        <circleGeometry args={[1, 8]} />
        <meshBasicMaterial transparent depthWrite={false} />
      </instancedMesh>

      {/* Shooting star with longer tail */}
      <group ref={shootingStarGroupRef} visible={false}>
        {Array.from({ length: 12 }, (_, i) => {
          const t = i / 12;
          return (
            <mesh key={i} position={[i * 0.06, 0, 0]}>
              <circleGeometry args={[0.05 * (1 - t * 0.5), 6]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.9} depthWrite={false} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}
