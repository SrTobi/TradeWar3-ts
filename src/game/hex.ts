import type { HexCoord } from '@/types/game';

const HEX_DIRECTIONS: HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function hexKey(coord: HexCoord): string {
  return `${coord.q},${coord.r}`;
}

export function parseHexKey(key: string): HexCoord {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
}

export function hexEquals(a: HexCoord, b: HexCoord): boolean {
  return a.q === b.q && a.r === b.r;
}

export function hexAdd(a: HexCoord, b: HexCoord): HexCoord {
  return { q: a.q + b.q, r: a.r + b.r };
}

export function hexNeighbors(coord: HexCoord): HexCoord[] {
  return HEX_DIRECTIONS.map((dir) => hexAdd(coord, dir));
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

export function generateHexGrid(radius: number): HexCoord[] {
  const hexes: HexCoord[] = [];
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius);
    const r2 = Math.min(radius, -q + radius);
    for (let r = r1; r <= r2; r++) {
      hexes.push({ q, r });
    }
  }
  return hexes;
}

export function hexToPixel(coord: HexCoord, size: number): { x: number; y: number } {
  const x = size * (3 / 2) * coord.q;
  const y = size * Math.sqrt(3) * (coord.r + coord.q / 2);
  return { x, y };
}

export function pixelToHex(x: number, y: number, size: number): HexCoord {
  const q = ((2 / 3) * x) / size;
  const r = ((-1 / 3) * x) / size + ((Math.sqrt(3) / 3) * y) / size;
  return hexRound({ q, r });
}

function hexRound(coord: { q: number; r: number }): HexCoord {
  const s = -coord.q - coord.r;
  let q = Math.round(coord.q);
  let r = Math.round(coord.r);
  const roundS = Math.round(s);

  const qDiff = Math.abs(q - coord.q);
  const rDiff = Math.abs(r - coord.r);
  const sDiff = Math.abs(roundS - s);

  if (qDiff > rDiff && qDiff > sDiff) {
    q = -r - roundS;
  } else if (rDiff > sDiff) {
    r = -q - roundS;
  }

  return { q, r };
}
