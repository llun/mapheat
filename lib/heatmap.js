'use strict';

const turf = require('turf');
const simpleheat = require('simpleheat');
const fs = require('fs');
const util = require('./util');

const CENTER = 0;
const TOP = 1;
const RIGHT = 2;
const BOTTOM = 3;
const LEFT = 4;

// Each pane is 0.1 degree square
const degree = 0.1;

class Heatmap {

  constructor(options) {
    this.options = options || {
      size: 3000,
    };
    this._blocks = {};
  }

  key(location, position) {
    // Alter the key base on the position
    let longitude = location.longitude;
    let latitude = location.latitude;

    switch (position) {
      case TOP:
        latitude += degree;
        break;
      case RIGHT:
        longitude += degree;
        break;
      case BOTTOM:
        latitude -= degree;
        break;
      case LEFT:
        longitude -= degree;
        break;
      default:
        break;
    }

    // Floor down the locations
    const degreeExp = Math.abs(+degree.toExponential().split('e')[1]);
    const minX = util.floor(longitude, degreeExp);
    const minY = util.floor(latitude, degreeExp);
    const maxX = minX + degree;
    const maxY = minY + degree;

    return `${minX},${minY},${maxX.toFixed(degreeExp)},${maxY.toFixed(degreeExp)}`;
  }

  bounds(key) {
    const keys = key.split(',').map(item => parseFloat(item));
    const exp = Math.abs(+degree.toExponential().split('e')[1]);

    const minX = +(keys[0] - degree).toFixed(exp);
    const maxX = +(keys[2] + degree).toFixed(exp);
    const minY = +(keys[1] - degree).toFixed(exp);
    const maxY = +(keys[3] + degree).toFixed(exp);

    const nw = turf.point([minX, maxY]);
    const ne = turf.point([maxX, maxY]);
    const sw = turf.point([minX, minY]);
    const se = turf.point([maxX, minY]);

    const km1 = turf.distance(nw, ne);
    const km2 = turf.distance(nw, sw);
    const km3 = turf.distance(sw, se);

    const radians = Math.asin((km3 - km1) / km2);
    return {
      min: { x: minX, y: minY },
      max: { x: maxX, y: maxY },
      canvas: {
        min: { x: +keys[0], y: +keys[1] },
        max: { x: +keys[2], y: +keys[3] },
      },
      size: km3,
      radians,
    };
  }

  addPoint(point, blocks) {
    const centerKey = this.key(point);
    const topKey = this.key(point, TOP);
    const leftKey = this.key(point, LEFT);
    const bottomKey = this.key(point, BOTTOM);
    const rightKey = this.key(point, RIGHT);
    const keys = [centerKey, topKey, leftKey, bottomKey, rightKey];

    keys.forEach(key => {
      if (!blocks[key]) {
        blocks[key] = {
          points: new Set(),
          all: new Set(),
          bounds: this.bounds(key),
          key,
        };
      }

      blocks[key].all.add(point);
    });
    blocks[centerKey].points.add(point);
  }

  blocks() {
    return Object.keys(this._blocks)
      .map(block => this._blocks[block])
      .filter(block => (block.points.size > 0));
  }

  draw(block) {
    const size = this.options.size;
    const pane = this._createCanvas(size, size);
    const heat = simpleheat(pane);

    heat.radius(2, 3);

    const data = Array.from(block.all).map(point => {
      const origin = turf.point([point.longitude, point.latitude]);
      const originLeft = turf.point([block.bounds.min.x, point.latitude]);
      const originBottom = turf.point([point.longitude, block.bounds.min.y]);
      const q1 = turf.distance(originLeft, origin);
      const q3 = turf.distance(origin, originBottom);
      const q2 = q3 * Math.sin(block.bounds.radians);
      const q4 = q3 * Math.cos(block.bounds.radians);

      // Adjust x coordinate error because of length between two point in
      // northen(/southern) are shorter than in equator
      const x = Math.round(((q1 + q2) / block.bounds.size) * size);
      const y = size - Math.round(q4 / block.bounds.size * size);
      return [x, y, 0.01];
    });
    heat.data(data);
    heat.draw();

    const cropSize = size / 3;
    const crop = this._createCanvas(cropSize, cropSize);
    const cropContext = crop.getContext('2d');

    cropContext.drawImage(pane, cropSize, cropSize, cropSize, cropSize, 0, 0, cropSize, cropSize);
    return crop;
  }

  import(data) {
    data.forEach(point => {
      this.addPoint(point, this._blocks);
    });
  }

  write(directory, callback) {
    return new Promise((resolve, reject) => {
      fs.mkdir(directory, error => (error ? reject(error) : resolve()));
    }).then(() => {
      const blocks = Object.keys(this._blocks).filter(
        block => (this._blocks[block].points.size > 0));
      const promises = blocks.map(block =>
        new Promise((resolve, reject) => {
          const path = `${directory}/${block}.png`;
          fs.writeFile(path, this.draw(this._blocks[block]).toBuffer(),
            error => (error ? reject(error) : resolve(path)));
        }));
      return Promise.all(promises);
    }).then((paths) => {
      callback(null, paths);
    }).catch(err => {
      callback(err);
    });
  }

  _createCanvas(width, height) {
    // No document to use
    if (typeof document === 'undefined') {
      const Canvas = require('canvas');
      return new Canvas(width, height);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    return canvas;
  }

}

Heatmap.CENTER = CENTER;
Heatmap.TOP = TOP;
Heatmap.RIGHT = RIGHT;
Heatmap.BOTTOM = BOTTOM;
Heatmap.LEFT = LEFT;

module.exports = Heatmap;
