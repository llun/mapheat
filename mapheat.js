// @ts-check
const turf = require('@turf/turf');

/**
 * @typedef {{ size: number }} Option
 */
const degree = 0.1;

class MapHeat {
  constructor(/** @type {Option} */ options) {
    /** @type {Option} */
    this.options = options || {
      size: 3000
    };
    this.blocks = {};
  }

  /**
   * Block key
   *
   * @param {import('./types').Point} point
   * @param {import('./types').Position} [position]
   */
  key(point, position) {
    // Alter the key base on the position
    let longitude = point.longitude;
    let latitude = point.latitude;

    switch (position) {
      case 'top':
        latitude += degree;
        break;
      case 'bottom':
        latitude -= degree;
        break;
      case 'left':
        longitude -= degree;
        break;
      case 'right':
        longitude += degree;
        break;
    }

    // Floor down the locations
    const degreeExp = Math.abs(+degree.toExponential().split('e')[1]);
    const minX = this.decimalAdjust(longitude, degreeExp);
    const minY = this.decimalAdjust(latitude, degreeExp);
    const maxX = minX + degree;
    const maxY = minY + degree;

    return `${minX},${minY},${maxX.toFixed(degreeExp)},${maxY.toFixed(
      degreeExp
    )}`;
  }

  /**
   *
   * @param {string} key
   * @return {import('./types').Boundary}
   */
  bounds(key) {
    const keys = key.split(',').map((item) => parseFloat(item));
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
      min: { longitude: minX, latitude: minY },
      max: { longitude: maxX, latitude: maxY },
      canvas: {
        min: { longitude: +keys[0], latitude: +keys[1] },
        max: { longitude: +keys[2], latitude: +keys[3] }
      },
      size: km3,
      radians
    };
  }

  /**
   *
   * @param {import('./types').Point} point
   * @param {import('./types').Blocks} blocks
   */
  addPoint(point, blocks) {
    const centerKey = this.key(point);
    const topKey = this.key(point, 'top');
    const leftKey = this.key(point, 'left');
    const bottomKey = this.key(point, 'bottom');
    const rightKey = this.key(point, 'right');
    const keys = [centerKey, topKey, leftKey, bottomKey, rightKey];

    keys.forEach((key) => {
      if (!blocks[key]) {
        blocks[key] = {
          points: new Set(),
          all: new Set(),
          bounds: this.bounds(key),
          key
        };
      }

      blocks[key].all.add(point);
    });
    blocks[centerKey].points.add(point);
  }

  /**
   * Decimal adjustment of a number
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/floor
   *
   * @param {number} value
   * @param {number} [exp]
   */
  decimalAdjust(value, exp = 0) {
    const expValue = Math.abs(value).toExponential().split('e');
    const shiftValue = +`${expValue[0]}e${+expValue[1] + exp}`;
    const floorValue = Math.floor(shiftValue).toExponential().split('e');
    const reverseValue = +`${floorValue[0]}e${+floorValue[1] - exp}`;

    return reverseValue * (value < 0 ? -1 : 1);
  }
}

module.exports = MapHeat;
