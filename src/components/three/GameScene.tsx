import { useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
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

// Tilt the hex map slightly to show 3D depth (isometric-style view)
const HEX_MAP_TILT = -Math.PI / 8; // ~22.5 degrees tilt

function CameraController() {
  const { camera, size } = useThree();
  const cameraRef = useRef(camera as THREE.OrthographicCamera);

  useEffect(() => {
    cameraRef.current = camera as THREE.OrthographicCamera;
  }, [camera]);

  useEffect(() => {
    const updateCamera = () => {
      const cam = cameraRef.current;
      if (!cam) return;

      // Available width after accounting for left panel
      const availableWidth = size.width - LEFT_PANEL_WIDTH;

      // Calculate zoom to fit the map in the available viewport
      const worldWidth = MAP_WIDTH + PADDING * 2;
      const worldHeight = MAP_HEIGHT + PADDING * 2;

      // Zoom is pixels per world unit
      const zoomX = availableWidth / worldWidth;
      const zoomY = size.height / worldHeight;

      // Use the smaller zoom to ensure the entire map fits
      cam.zoom = Math.min(zoomX, zoomY);

      // Offset camera to center map in available space (right of panel)
      // Move camera LEFT so the content appears shifted RIGHT
      const offsetX = LEFT_PANEL_WIDTH / 2 / cam.zoom;
      cam.position.x = -offsetX;

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
      <OrthographicCamera makeDefault position={[0, 0, 10]} zoom={50} near={0.1} far={100} />
      <CameraController />
      <color attach="background" args={['#050508']} />
      {/* Lighting for 3D hex tiles */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 7]} intensity={0.6} color="#ffffff" />
      <EnergyGrid />
      <Starfield />
      <SpaceDust />
      {/* Tilt the hex map to show 3D depth */}
      <group rotation={[HEX_MAP_TILT, 0, 0]}>
        <HexMap />
      </group>
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
