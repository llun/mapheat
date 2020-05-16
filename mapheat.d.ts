import type { Point, Position } from "./types";

declare class MapHeat {
  key(point: Point, position?: Position): string;
  decimalAdjust(value: number, exp?: number): number;
}

export = MapHeat;
