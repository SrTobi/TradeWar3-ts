import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Country, HexCoord } from '@/types/game';
import { hexToPixel } from '@/game/hex';
import { playBattle } from '@/audio/sounds';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: THREE.Color;
  size: number;
}

interface Explosion {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

interface ParticlesProps {
  countries: Country[];
  size: number;
}

const MAX_PARTICLES = 500;
const PARTICLES_PER_BATTLE = 25;
const MAX_EXPLOSIONS = 20;

export function Particles({ countries, size }: ParticlesProps) {
  const particlesRef = useRef<Particle[]>([]);
  const explosionsRef = useRef<Explosion[]>([]);
  const prevUnitsRef = useRef<Map<string, Record<string, number>>>(new Map());
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const flashMeshRef = useRef<THREE.InstancedMesh>(null);
  const ringMeshRef = useRef<THREE.InstancedMesh>(null);

  const tempMatrix = useRef(new THREE.Matrix4());
  const tempColor = useRef(new THREE.Color());

  // Detect battles by comparing unit counts
  useEffect(() => {
    const prevUnits = prevUnitsRef.current;

    for (const country of countries) {
      const key = `${country.coords.q},${country.coords.r}`;
      const prev = prevUnits.get(key);

      if (prev) {
        // Check if any faction lost units (battle occurred)
        let battleOccurred = false;
        const battleColor = new THREE.Color(1, 0.5, 0.2); // Default orange

        for (const [factionId, count] of Object.entries(country.units)) {
          const prevCount = prev[factionId] || 0;
          if (count < prevCount) {
            battleOccurred = true;
            // Could get faction color here for more variety
            break;
          }
        }

        if (battleOccurred) {
          const pos = hexToPixel(country.coords, size);
          emitBattleParticles(pos.x, pos.y, particlesRef.current);
          emitExplosion(pos.x, pos.y, explosionsRef.current, battleColor);
          playBattle();
        }
      }

      prevUnits.set(key, { ...country.units });
    }
  }, [countries, size]);

  function emitBattleParticles(x: number, y: number, particles: Particle[]) {
    if (particles.length >= MAX_PARTICLES - PARTICLES_PER_BATTLE) return;

    for (let i = 0; i < PARTICLES_PER_BATTLE; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3;

      // Vary colors: orange, red, yellow, white
      const colorVariant = Math.random();
      let color: THREE.Color;
      if (colorVariant < 0.4) {
        color = new THREE.Color().setHSL(0.08, 1, 0.6); // Orange
      } else if (colorVariant < 0.7) {
        color = new THREE.Color().setHSL(0.05, 1, 0.55); // Red-orange
      } else if (colorVariant < 0.9) {
        color = new THREE.Color().setHSL(0.12, 1, 0.7); // Yellow
      } else {
        color = new THREE.Color(1, 1, 1); // White sparks
      }

      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.6,
        color,
        size: 0.06 + Math.random() * 0.1,
      });
    }
  }

  function emitExplosion(x: number, y: number, explosions: Explosion[], color: THREE.Color) {
    if (explosions.length >= MAX_EXPLOSIONS) {
      explosions.shift(); // Remove oldest
    }

    explosions.push({
      x,
      y,
      life: 0,
      maxLife: 0.5,
      color: color.clone(),
    });
  }

  useFrame((_, delta) => {
    const particles = particlesRef.current;
    const explosions = explosionsRef.current;

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += delta;

      if (p.life >= p.maxLife) {
        particles.splice(i, 1);
        continue;
      }

      // Physics
      p.vy -= 2.0 * delta; // Gravity
      p.vx *= 0.96; // Drag
      p.vy *= 0.96;
      p.x += p.vx * delta * 60;
      p.y += p.vy * delta * 60;
    }

    // Update explosions
    for (let i = explosions.length - 1; i >= 0; i--) {
      const e = explosions[i];
      e.life += delta;
      if (e.life >= e.maxLife) {
        explosions.splice(i, 1);
      }
    }

    // Update particle instances
    if (meshRef.current) {
      for (let i = 0; i < MAX_PARTICLES; i++) {
        if (i < particles.length) {
          const p = particles[i];
          const progress = p.life / p.maxLife;
          const alpha = 1 - progress;
          const scale = p.size * (1.2 - progress * 0.7);

          tempMatrix.current.makeScale(scale, scale, 1);
          tempMatrix.current.setPosition(p.x, p.y, 0.3);
          meshRef.current.setMatrixAt(i, tempMatrix.current);

          tempColor.current.copy(p.color).multiplyScalar(alpha * 1.5);
          meshRef.current.setColorAt(i, tempColor.current);
        } else {
          tempMatrix.current.makeScale(0, 0, 0);
          meshRef.current.setMatrixAt(i, tempMatrix.current);
        }
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
      if (meshRef.current.instanceColor) {
        meshRef.current.instanceColor.needsUpdate = true;
      }
    }

    // Update flash instances (central bright flash)
    if (flashMeshRef.current) {
      for (let i = 0; i < MAX_EXPLOSIONS; i++) {
        if (i < explosions.length) {
          const e = explosions[i];
          const progress = e.life / e.maxLife;

          // Flash starts big and fades quickly
          const flashProgress = Math.min(progress * 3, 1);
          const alpha =
            flashProgress < 0.3
              ? flashProgress / 0.3
              : Math.max(0, 1 - (flashProgress - 0.3) / 0.7);
          const flashScale = size * (0.3 + progress * 0.5) * alpha;

          tempMatrix.current.makeScale(flashScale, flashScale, 1);
          tempMatrix.current.setPosition(e.x, e.y, 0.25);
          flashMeshRef.current.setMatrixAt(i, tempMatrix.current);

          tempColor.current.setRGB(1, 0.9, 0.7).multiplyScalar(alpha * 2);
          flashMeshRef.current.setColorAt(i, tempColor.current);
        } else {
          tempMatrix.current.makeScale(0, 0, 0);
          flashMeshRef.current.setMatrixAt(i, tempMatrix.current);
        }
      }
      flashMeshRef.current.instanceMatrix.needsUpdate = true;
      if (flashMeshRef.current.instanceColor) {
        flashMeshRef.current.instanceColor.needsUpdate = true;
      }
    }

    // Update ring instances (expanding shockwave)
    if (ringMeshRef.current) {
      for (let i = 0; i < MAX_EXPLOSIONS; i++) {
        if (i < explosions.length) {
          const e = explosions[i];
          const progress = e.life / e.maxLife;

          const alpha = Math.max(0, 1 - progress);
          const ringScale = size * (0.2 + progress * 1.2);

          tempMatrix.current.makeScale(ringScale, ringScale, 1);
          tempMatrix.current.setPosition(e.x, e.y, 0.2);
          ringMeshRef.current.setMatrixAt(i, tempMatrix.current);

          tempColor.current.copy(e.color).multiplyScalar(alpha * 0.8);
          ringMeshRef.current.setColorAt(i, tempColor.current);
        } else {
          tempMatrix.current.makeScale(0, 0, 0);
          ringMeshRef.current.setMatrixAt(i, tempMatrix.current);
        }
      }
      ringMeshRef.current.instanceMatrix.needsUpdate = true;
      if (ringMeshRef.current.instanceColor) {
        ringMeshRef.current.instanceColor.needsUpdate = true;
      }
    }
  });

  return (
    <group>
      {/* Expanding shockwave rings */}
      <instancedMesh ref={ringMeshRef} args={[undefined, undefined, MAX_EXPLOSIONS]}>
        <ringGeometry args={[0.85, 1, 32]} />
        <meshBasicMaterial transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </instancedMesh>

      {/* Central flash */}
      <instancedMesh ref={flashMeshRef} args={[undefined, undefined, MAX_EXPLOSIONS]}>
        <circleGeometry args={[1, 16]} />
        <meshBasicMaterial transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </instancedMesh>

      {/* Battle particles */}
      <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PARTICLES]}>
        <circleGeometry args={[1, 8]} />
        <meshBasicMaterial transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </instancedMesh>
    </group>
  );
}

// Export function to trigger ripple from outside
export function createRippleEmitter() {
  const ripples: Array<{ x: number; y: number; life: number; maxLife: number }> = [];

  return {
    emit: (coords: HexCoord, size: number) => {
      const pos = hexToPixel(coords, size);
      ripples.push({
        x: pos.x,
        y: pos.y,
        life: 0,
        maxLife: 0.4,
      });
    },
    ripples,
  };
}
