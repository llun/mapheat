export type Position = 'center' | 'top' | 'right' | 'bottom' | 'left';

export type Point = {
  latitude: number;
  longitude: number;
};

export type Boundary = {
  min: Point;
  max: Point;
  canvas: {
    min: Point;
    max: Point;
  };
  radians: number;
  size: number;
};

export type Block = {
  points: Set<Point>;
  all: Set<Point>;
  bounds: Boundary;
  key: string;
};

export type Blocks = {
  [key in string]: Block;
};
