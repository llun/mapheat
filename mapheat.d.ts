import type { Canvas } from 'canvas';
import type { Point, Position, Boundary, Blocks, Block } from './types';

declare class MapHeat {
  key(point: Point, position?: Position): string;
  decimalAdjust(
    type: 'floor' | 'ceil' | 'round',
    value: number,
    exp?: number
  ): number;
  bounds(key: string): Boundary;
  addPoint(point: Point, blocks: Blocks);
  draw(block: Block): Canvas;
}

export = MapHeat;
