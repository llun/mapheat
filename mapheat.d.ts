import type { Point, Position, Boundary } from './types';

declare class MapHeat {
  key(point: Point, position?: Position): string;
  decimalAdjust(value: number, exp?: number): number;
  bounds(key: string): Boundary;
}

export = MapHeat;
