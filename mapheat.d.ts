import type { Canvas } from 'canvas';
import type {
  Point,
  Position,
  Boundary,
  Blocks,
  Block,
  Parameters
} from './types';

declare class MapHeat {
  constructor(params?: Parameters);
  key(point: Point, position?: Position): string;
  decimalAdjust(
    type: 'floor' | 'ceil' | 'round',
    value: number,
    exp?: number
  ): number;
  setBlur(blur: number);
  bounds(key: string): Boundary;
  addPoint(point: Point, blocks: Blocks);
  draw(block: Block): Canvas;
  write(dir: string, blocks: Blocks);
}

export = MapHeat;
