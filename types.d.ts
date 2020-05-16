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
