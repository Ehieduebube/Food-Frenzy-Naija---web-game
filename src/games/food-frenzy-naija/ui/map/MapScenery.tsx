import { memo, type CSSProperties, type ReactNode } from 'react';
import {
  BasketSprite,
  BoatSprite,
  BridgeSprite,
  BuntingSprite,
  BushSprite,
  CratesSprite,
  DanfoSprite,
  DrumSprite,
  GateSprite,
  GrillSprite,
  HouseSprite,
  LagosSignSprite,
  MarketUmbrellaSprite,
  PalmSprite,
  SkylineSprite,
  StallSprite,
  TreeSprite,
  UmbrellaTableSprite,
  VibesSignSprite,
} from '../../art/MapSprites';
import type { RegionId } from '../../levels/types';
import { GATE_Y, ROAD_HALF, roadXAt, type MapLayout } from './mapLayout';

type Kind =
  | 'tree'
  | 'tree2'
  | 'palm'
  | 'bush'
  | 'houseA'
  | 'houseB'
  | 'houseC'
  | 'houseD'
  | 'stall'
  | 'stall2'
  | 'stall3'
  | 'danfo'
  | 'lagosSign'
  | 'vibesSign'
  | 'umbrellaTable'
  | 'umbrellaTable2'
  | 'umbrellaRed'
  | 'umbrellaBlue'
  | 'skyline'
  | 'bridge'
  | 'boat'
  | 'grill'
  | 'drum'
  | 'basket'
  | 'crates'
  | 'water'
  | 'bunting';

/**
 * near   - beside the road, on whichever side has room at that height (visible on every screen)
 * outerL - beyond the left edge of the road's track (wide screens)
 * outerR - beyond the right edge of the road's track (wide screens)
 * center - across the road (bunting)
 * y is the item's ground line as a fraction of the region's height (0 = top).
 */
interface Spec {
  kind: Kind;
  y: number;
  w: number;
  place?: 'near' | 'outerL' | 'outerR' | 'center';
  dx?: number;
  flip?: boolean;
  /** water only: height as a fraction of the region */
  h?: number;
}

const SCENES: Record<RegionId, Spec[]> = {
  mainland: [
    { kind: 'vibesSign', y: 0.97, w: 84 },
    { kind: 'stall', y: 0.88, w: 140 },
    { kind: 'tree', y: 0.79, w: 92 },
    { kind: 'danfo', y: 0.7, w: 140 },
    { kind: 'houseA', y: 0.61, w: 116 },
    { kind: 'lagosSign', y: 0.52, w: 80 },
    { kind: 'umbrellaTable', y: 0.43, w: 124 },
    { kind: 'palm', y: 0.34, w: 92 },
    { kind: 'houseB', y: 0.25, w: 116 },
    { kind: 'bush', y: 0.16, w: 84 },
    { kind: 'skyline', y: 0.24, w: 300, place: 'outerL', dx: 30 },
    { kind: 'tree2', y: 0.34, w: 120, place: 'outerL', dx: 250 },
    { kind: 'houseC', y: 0.47, w: 140, place: 'outerL', dx: 40 },
    { kind: 'tree', y: 0.57, w: 110, place: 'outerL', dx: 220 },
    { kind: 'stall3', y: 0.72, w: 170, place: 'outerL', dx: 50 },
    { kind: 'palm', y: 0.86, w: 120, place: 'outerL', dx: 230 },
    { kind: 'bush', y: 0.95, w: 100, place: 'outerL', dx: 40 },
    { kind: 'water', y: 0.04, h: 0.46, w: 0, place: 'outerR', dx: 46 },
    { kind: 'bridge', y: 0.33, w: 340, place: 'outerR', dx: 70 },
    { kind: 'boat', y: 0.45, w: 110, place: 'outerR', dx: 250 },
    { kind: 'palm', y: 0.63, w: 120, place: 'outerR', dx: 40 },
    { kind: 'tree2', y: 0.6, w: 110, place: 'outerR', dx: 240 },
    { kind: 'danfo', y: 0.78, w: 160, place: 'outerR', dx: 120, flip: true },
    { kind: 'houseD', y: 0.94, w: 140, place: 'outerR', dx: 40 },
  ],
  balogun: [
    { kind: 'stall2', y: 0.92, w: 140 },
    { kind: 'crates', y: 0.83, w: 80 },
    { kind: 'umbrellaRed', y: 0.74, w: 110 },
    { kind: 'basket', y: 0.65, w: 64 },
    { kind: 'stall3', y: 0.56, w: 140, flip: true },
    { kind: 'tree', y: 0.47, w: 92 },
    { kind: 'umbrellaBlue', y: 0.38, w: 110 },
    { kind: 'houseB', y: 0.29, w: 116 },
    { kind: 'crates', y: 0.2, w: 80 },
    { kind: 'bush', y: 0.12, w: 84 },
    { kind: 'stall', y: 0.2, w: 170, place: 'outerL', dx: 40 },
    { kind: 'umbrellaRed', y: 0.36, w: 130, place: 'outerL', dx: 230 },
    { kind: 'stall2', y: 0.5, w: 170, place: 'outerL', dx: 40 },
    { kind: 'houseA', y: 0.68, w: 150, place: 'outerL', dx: 60 },
    { kind: 'tree2', y: 0.82, w: 110, place: 'outerL', dx: 240 },
    { kind: 'crates', y: 0.94, w: 100, place: 'outerL', dx: 60 },
    { kind: 'stall3', y: 0.25, w: 170, place: 'outerR', dx: 40, flip: true },
    { kind: 'basket', y: 0.38, w: 80, place: 'outerR', dx: 250 },
    { kind: 'umbrellaBlue', y: 0.52, w: 130, place: 'outerR', dx: 50 },
    { kind: 'stall', y: 0.68, w: 170, place: 'outerR', dx: 160, flip: true },
    { kind: 'houseC', y: 0.88, w: 150, place: 'outerR', dx: 40 },
  ],
  lekki: [
    { kind: 'palm', y: 0.93, w: 96 },
    { kind: 'umbrellaTable', y: 0.84, w: 124 },
    { kind: 'grill', y: 0.75, w: 104 },
    { kind: 'palm', y: 0.66, w: 96, flip: true },
    { kind: 'lagosSign', y: 0.57, w: 80 },
    { kind: 'danfo', y: 0.48, w: 140 },
    { kind: 'palm', y: 0.39, w: 96 },
    { kind: 'umbrellaTable2', y: 0.3, w: 124 },
    { kind: 'bush', y: 0.21, w: 84 },
    { kind: 'palm', y: 0.13, w: 92, flip: true },
    { kind: 'water', y: 0.02, h: 0.98, w: 0, place: 'outerL', dx: 36 },
    { kind: 'boat', y: 0.28, w: 120, place: 'outerL', dx: 130 },
    { kind: 'bridge', y: 0.55, w: 340, place: 'outerL', dx: 60, flip: true },
    { kind: 'boat', y: 0.82, w: 110, place: 'outerL', dx: 230, flip: true },
    { kind: 'skyline', y: 0.27, w: 300, place: 'outerR', dx: 40 },
    { kind: 'palm', y: 0.5, w: 120, place: 'outerR', dx: 40 },
    { kind: 'umbrellaTable2', y: 0.63, w: 140, place: 'outerR', dx: 170 },
    { kind: 'houseA', y: 0.8, w: 140, place: 'outerR', dx: 40 },
    { kind: 'palm', y: 0.93, w: 110, place: 'outerR', dx: 220 },
  ],
  carnival: [
    { kind: 'drum', y: 0.94, w: 62 },
    { kind: 'stall', y: 0.86, w: 140 },
    { kind: 'tree', y: 0.77, w: 92 },
    { kind: 'drum', y: 0.68, w: 62 },
    { kind: 'umbrellaRed', y: 0.59, w: 110 },
    { kind: 'stall2', y: 0.5, w: 140 },
    { kind: 'drum', y: 0.42, w: 62 },
    { kind: 'palm', y: 0.34, w: 92 },
    { kind: 'umbrellaTable', y: 0.27, w: 124 },
    { kind: 'bunting', y: 0.9, w: 360, place: 'center' },
    { kind: 'bunting', y: 0.63, w: 360, place: 'center' },
    { kind: 'bunting', y: 0.4, w: 360, place: 'center' },
    { kind: 'stall3', y: 0.3, w: 170, place: 'outerL', dx: 40 },
    { kind: 'drum', y: 0.45, w: 80, place: 'outerL', dx: 240 },
    { kind: 'tree2', y: 0.6, w: 120, place: 'outerL', dx: 40 },
    { kind: 'umbrellaRed', y: 0.75, w: 130, place: 'outerL', dx: 200 },
    { kind: 'stall2', y: 0.92, w: 170, place: 'outerL', dx: 40 },
    { kind: 'stall', y: 0.3, w: 170, place: 'outerR', dx: 40, flip: true },
    { kind: 'tree', y: 0.48, w: 120, place: 'outerR', dx: 220 },
    { kind: 'drum', y: 0.6, w: 80, place: 'outerR', dx: 60 },
    { kind: 'umbrellaBlue', y: 0.78, w: 130, place: 'outerR', dx: 60 },
    { kind: 'palm', y: 0.92, w: 120, place: 'outerR', dx: 230 },
  ],
};

function sprite(kind: Kind, w: number, flip?: boolean): ReactNode {
  switch (kind) {
    case 'tree':
      return <TreeSprite w={w} flip={flip} />;
    case 'tree2':
      return <TreeSprite w={w} flip={flip} tone={1} />;
    case 'palm':
      return <PalmSprite w={w} flip={flip} />;
    case 'bush':
      return <BushSprite w={w} flip={flip} />;
    case 'houseA':
      return <HouseSprite w={w} flip={flip} wall="#f28a5a" />;
    case 'houseB':
      return <HouseSprite w={w} flip={flip} wall="#f2c94a" roof="#b5482a" />;
    case 'houseC':
      return <HouseSprite w={w} flip={flip} wall="#7ac46a" roof="#c43c22" />;
    case 'houseD':
      return <HouseSprite w={w} flip={flip} wall="#5aa8d8" roof="#a8361c" />;
    case 'stall':
      return <StallSprite w={w} flip={flip} foods={[0, 4, 2]} />;
    case 'stall2':
      return <StallSprite w={w} flip={flip} foods={[3, 6, 1]} />;
    case 'stall3':
      return <StallSprite w={w} flip={flip} foods={[5, 0, 2]} />;
    case 'danfo':
      return <DanfoSprite w={w} flip={flip} />;
    case 'lagosSign':
      return <LagosSignSprite w={w} />;
    case 'vibesSign':
      return <VibesSignSprite w={w} />;
    case 'umbrellaTable':
      return <UmbrellaTableSprite w={w} flip={flip} />;
    case 'umbrellaTable2':
      return <UmbrellaTableSprite w={w} flip={flip} a="#1f6fd8" b="#fff4e0" />;
    case 'umbrellaRed':
      return <MarketUmbrellaSprite w={w} flip={flip} />;
    case 'umbrellaBlue':
      return <MarketUmbrellaSprite w={w} flip={flip} a="#1f4fb8" b="#ffc93a" />;
    case 'skyline':
      return <SkylineSprite w={w} flip={flip} />;
    case 'bridge':
      return <BridgeSprite w={w} flip={flip} />;
    case 'boat':
      return <BoatSprite w={w} flip={flip} />;
    case 'grill':
      return <GrillSprite w={w} flip={flip} />;
    case 'drum':
      return <DrumSprite w={w} flip={flip} />;
    case 'basket':
      return <BasketSprite w={w} />;
    case 'crates':
      return <CratesSprite w={w} />;
    case 'bunting':
      return <BuntingSprite w={w} />;
    case 'water':
      return null;
  }
}

/** Height / width of each sprite (matches the viewBoxes in MapSprites). */
const ASPECT: Record<Kind, number> = {
  tree: 1.24,
  tree2: 1.24,
  palm: 170 / 124,
  bush: 0.62,
  houseA: 1,
  houseB: 1,
  houseC: 1,
  houseD: 1,
  stall: 150 / 170,
  stall2: 150 / 170,
  stall3: 150 / 170,
  danfo: 110 / 200,
  lagosSign: 140 / 110,
  vibesSign: 150 / 120,
  umbrellaTable: 150 / 160,
  umbrellaTable2: 150 / 160,
  umbrellaRed: 120 / 130,
  umbrellaBlue: 120 / 130,
  skyline: 240 / 290,
  bridge: 190 / 340,
  boat: 70 / 120,
  grill: 1,
  drum: 1.25,
  basket: 1,
  crates: 0.9,
  water: 0,
  bunting: 0.15,
};

/** Distance kept between a sprite and the road centre (road half-width + a level button + margin). */
const ROAD_CLEAR = ROAD_HALF + 20;

/**
 * Place a roadside sprite on the side of the road with more room across the sprite's full height,
 * shrinking it a little when even that side is tight (small phones).
 */
function besideRoad(layout: MapLayout, y: number, w: number, aspect: number, trackW: number, worldW: number): { left: number; w: number } {
  const h = w * aspect;
  let minX = Infinity;
  let maxX = -Infinity;
  for (let k = 0; k <= 4; k++) {
    const x = (roadXAt(layout.road, y - (h * k) / 4) / 100) * trackW;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
  }
  const outside = Math.max(0, (worldW - trackW) / 2); // extra room beyond the track on wide screens
  const roomL = minX - ROAD_CLEAR + outside;
  const roomR = trackW - maxX - ROAD_CLEAR + outside;
  const room = Math.max(roomL, roomR);
  const width = room >= w ? w : Math.max(w * 0.62, room);
  return roomL >= roomR ? { left: minX - ROAD_CLEAR - width, w: width } : { left: maxX + ROAD_CLEAR, w: width };
}

/** All scenery for the map, positioned around the road. Rendered inside the road's track. */
export const MapScenery = memo(function MapScenery({ layout, trackW, worldW }: { layout: MapLayout; trackW: number; worldW: number }) {
  const items: ReactNode[] = [];
  const over: ReactNode[] = [];
  for (const band of layout.bands) {
    SCENES[band.region.id].forEach((s, i) => {
      const key = `${band.region.id}-${i}`;
      const y = band.top + s.y * band.height;
      const place = s.place ?? 'near';
      if (s.kind === 'water') {
        const style: CSSProperties = {
          top: y,
          height: (s.h ?? 0.5) * band.height,
          ...(place === 'outerL' ? { right: `calc(100% + ${s.dx ?? 0}px)` } : { left: `calc(100% + ${s.dx ?? 0}px)` }),
        };
        items.push(<div key={key} className={`ffn-map-water is-${place === 'outerL' ? 'left' : 'right'}`} style={style} />);
        return;
      }
      let left: string;
      let w = s.w;
      if (place === 'center') left = `calc(50% - ${s.w / 2}px)`;
      else if (place === 'outerL') left = `calc(-${s.dx ?? 0}px - ${s.w}px)`;
      else if (place === 'outerR') left = `calc(100% + ${s.dx ?? 0}px)`;
      else {
        const spot = besideRoad(layout, y, s.w, ASPECT[s.kind], trackW, worldW);
        left = `${Math.round(spot.left)}px`;
        w = Math.round(spot.w);
      }
      const el = (
        <div key={key} className={`ffn-map-sprite is-${place}`} style={{ top: y, left }}>
          {sprite(s.kind, w, s.flip)}
        </div>
      );
      if (place === 'center') over.push(el);
      else items.push(el);
    });
  }
  return (
    <>
      <div className="ffn-map-scenery" aria-hidden="true">
        {items}
      </div>
      <MapOverRoad>{over}</MapOverRoad>
    </>
  );
});

function MapOverRoad({ children }: { children: ReactNode }) {
  return (
    <div className="ffn-map-over" aria-hidden="true">
      {children}
      <div className="ffn-map-sprite is-gate" style={{ top: GATE_Y, left: 'calc(50% - 150px)' }}>
        <GateSprite w={300} />
      </div>
    </div>
  );
}
