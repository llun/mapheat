import type { Point, Position, Boundary, Blocks } from './types';

declare class MapHeat {
  key(point: Point, position?: Position): string;
  decimalAdjust(value: number, exp?: number): number;
  bounds(key: string): Boundary;
  addPoint(point: Point, blocks: Blocks);
}

export = MapHeat;
