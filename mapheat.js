// @ts-check
/**
 * @typedef {{ size: number }} Option
 */
const degree = 0.1;

class MapHeat {
  constructor(/** @type {Option} */ options) {
    /** @type {Option} */
    this.options = options || {
      size: 3000,
    };
    this.blocks = {};
  }

  /**
   * Block key
   *
   * @param {import('./types').Point} point
   * @param {import('./types').Position?} position
   */
  key(point, position) {
    // Alter the key base on the position
    let longitude = point.longitude;
    let latitude = point.latitude;

    switch (position) {
      case "top":
        latitude += degree;
        break;
      case "bottom":
        latitude -= degree;
        break;
      case "left":
        longitude -= degree;
        break;
      case "right":
        longitude += degree;
        break;
    }

    // Floor down the locations
    const degreeExp = Math.abs(+degree.toExponential().split("e")[1]);
    const minX = this.decimalAdjust(longitude, degreeExp);
    const minY = this.decimalAdjust(latitude, degreeExp);
    const maxX = minX + degree;
    const maxY = minY + degree;

    return `${minX},${minY},${maxX.toFixed(degreeExp)},${maxY.toFixed(
      degreeExp
    )}`;
  }

  /**
   * Decimal adjustment of a number
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/floor
   *
   * @param {number} value
   * @param {number?} exp
   */
  decimalAdjust(value, exp) {
    if (!exp) exp = 0;
    const expValue = Math.abs(value).toExponential().split("e");
    const shiftValue = +`${expValue[0]}e${+expValue[1] + exp}`;
    const floorValue = Math.floor(shiftValue).toExponential().split("e");
    const reverseValue = +`${floorValue[0]}e${+floorValue[1] - exp}`;

    return reverseValue * (value < 0 ? -1 : 1);
  }
}

module.exports = MapHeat;
