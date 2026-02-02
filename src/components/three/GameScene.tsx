import { useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { HexMap } from './HexMap';
import { Starfield } from './Starfield';
import { SpaceDust } from './SpaceDust';
import { EnergyGrid } from './EnergyGrid';
import { EFFECT_SETTINGS } from './effectSettings';
import { GAME } from '@/game/constants';

// Calculate the world bounds of the hex map
const HEX_SIZE = 1;
const MAP_RADIUS = GAME.MAP_RADIUS;
// For flat-top hexes, width spans about 1.5 * size per hex horizontally
// Height spans about sqrt(3) * size per hex vertically
const MAP_WIDTH = (MAP_RADIUS * 2 + 1) * HEX_SIZE * 1.75;
const MAP_HEIGHT = (MAP_RADIUS * 2 + 1) * HEX_SIZE * Math.sqrt(3);
const PADDING = 1.5; // Extra padding around the map
const LEFT_PANEL_WIDTH = 520; // Width of StockPanel in pixels

// Camera angle for 3D view (tilt angle in radians, ~30 degrees from vertical)
const CAMERA_TILT_ANGLE = Math.PI / 6; // 30 degrees

function CameraController() {
  const { camera, size } = useThree();
  const cameraRef = useRef(camera as THREE.PerspectiveCamera);
  const initializedRef = useRef(false);

  useEffect(() => {
    cameraRef.current = camera as THREE.PerspectiveCamera;
  }, [camera]);

  useEffect(() => {
    // Only run once to avoid update loops
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    const updateCamera = () => {
      const cam = cameraRef.current;
      if (!cam) return;

      // Available width after accounting for left panel
      const availableWidth = size.width - LEFT_PANEL_WIDTH;
      const aspectRatio = availableWidth / size.height;

      // Calculate the distance needed to fit the map in view
      const worldWidth = MAP_WIDTH + PADDING * 2;
      const worldHeight = MAP_HEIGHT + PADDING * 2;
      
      // For perspective camera, calculate distance based on FOV
      const fov = cam.fov * (Math.PI / 180);
      const distanceForHeight = (worldHeight / 2) / Math.tan(fov / 2);
      const distanceForWidth = (worldWidth / 2) / Math.tan(fov / 2) / aspectRatio;
      
      // Use the larger distance to ensure the map fits
      const distance = Math.max(distanceForHeight, distanceForWidth) * 1.2;

      // Position camera at an angle to see the 3D depth
      const cameraY = -distance * Math.sin(CAMERA_TILT_ANGLE);
      const cameraZ = distance * Math.cos(CAMERA_TILT_ANGLE);
      
      // Offset camera to center map in available space (right of panel)
      // For perspective camera, we need to calculate the offset differently
      const offsetFactor = LEFT_PANEL_WIDTH / size.width;
      const offsetX = -worldWidth * offsetFactor * 0.5;

      cam.position.set(offsetX, cameraY, cameraZ);
      cam.lookAt(offsetX, 0, 0);

      cam.updateProjectionMatrix();
    };

    updateCamera();
  }, [size.width, size.height]);

  return null;
}

export function GameScene() {
  return (
    <Canvas
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: false }}
    >
      <PerspectiveCamera makeDefault position={[0, -8, 12]} fov={50} near={0.1} far={200} />
      <CameraController />
      <color attach="background" args={['#050508']} />
      {/* Enhanced lighting for real 3D hex tiles */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, -10, 15]} intensity={0.8} color="#ffffff" castShadow />
      <directionalLight position={[-5, -5, 10]} intensity={0.3} color="#4488ff" />
      <pointLight position={[0, 0, 5]} intensity={0.5} color="#ffffff" />
      <EnergyGrid />
      <Starfield />
      <SpaceDust />
      <HexMap />
      <EffectComposer>
        <Bloom
          intensity={EFFECT_SETTINGS.bloom.intensity}
          luminanceThreshold={EFFECT_SETTINGS.bloom.luminanceThreshold}
          luminanceSmoothing={EFFECT_SETTINGS.bloom.luminanceSmoothing}
          mipmapBlur
        />
        <Vignette
          eskil={false}
          offset={EFFECT_SETTINGS.vignette.offset}
          darkness={EFFECT_SETTINGS.vignette.darkness}
        />
      </EffectComposer>
    </Canvas>
  );
}
