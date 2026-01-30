import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface DustParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  size: number;
  brightness: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

const DUST_COUNT = 150;

export function SpaceDust() {
  const { size } = useThree();
  const dustRef = useRef<DustParticle[]>([]);
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Calculate world bounds based on viewport
  const worldBounds = useMemo(() => {
    const baseZoom = 50;
    return {
      halfW: size.width / baseZoom / 2 + 4,
      halfH: size.height / baseZoom / 2 + 4,
    };
  }, [size.width, size.height]);

  // Initialize dust particles
  useMemo(() => {
    const { halfW, halfH } = worldBounds;
    const particles: DustParticle[] = [];

    for (let i = 0; i < DUST_COUNT; i++) {
      particles.push({
        x: (Math.random() - 0.5) * halfW * 2,
        y: (Math.random() - 0.5) * halfH * 2,
        z: -0.5 - Math.random() * 0.5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.2 - 0.05,
        size: 0.02 + Math.random() * 0.03,
        brightness: 0.2 + Math.random() * 0.3,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.5 + Math.random() * 2,
      });
    }
    dustRef.current = particles;
  }, [worldBounds]);

  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  useFrame((state, delta) => {
    const dust = dustRef.current;
    if (!meshRef.current || dust.length === 0) return;

    const camera = state.camera as THREE.OrthographicCamera;
    const actualHalfW = (camera.right - camera.left) / 2 / camera.zoom + 4;
    const actualHalfH = (camera.top - camera.bottom) / 2 / camera.zoom + 4;

    for (let i = 0; i < dust.length; i++) {
      const p = dust[i];

      // Gentle floating motion
      p.x += p.vx * delta;
      p.y += p.vy * delta;

      // Wrap around screen
      if (p.x < -actualHalfW) p.x = actualHalfW;
      if (p.x > actualHalfW) p.x = -actualHalfW;
      if (p.y < -actualHalfH) p.y = actualHalfH;
      if (p.y > actualHalfH) p.y = -actualHalfH;

      // Twinkle effect
      p.twinklePhase += p.twinkleSpeed * delta;
      const twinkle = ((Math.sin(p.twinklePhase) + 1) / 2) * 0.5 + 0.5;
      const brightness = p.brightness * twinkle;

      // Update instance
      tempMatrix.makeScale(p.size, p.size, 1);
      tempMatrix.setPosition(p.x, p.y, p.z);
      meshRef.current.setMatrixAt(i, tempMatrix);

      // Soft blue-white color
      tempColor.setRGB(brightness * 0.7, brightness * 0.8, brightness);
      meshRef.current.setColorAt(i, tempColor);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, DUST_COUNT]}>
      <circleGeometry args={[1, 6]} />
      <meshBasicMaterial transparent opacity={0.6} depthWrite={false} />
    </instancedMesh>
  );
}
