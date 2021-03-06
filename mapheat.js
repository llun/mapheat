// @ts-check
const fs = require('fs');
const { point } = require('@turf/helpers');
const distance = require('@turf/distance').default;
const StackBlur = require('stackblur-canvas');
const { createCanvas } = require('canvas');

const degree = 0.1;
class MapHeat {
  constructor(/** @type {import('./types').Parameters} */ parameters) {
    /** @type {import('./types').Parameters} */
    this.parameters = {
      size: (parameters && parameters.size) || 3000,
      radius: (parameters && parameters.radius) || 2,
      blur: (parameters && parameters.blur) || 0,
      gradient: (parameters && parameters.gradient) || {
        0.4: 'blue',
        0.6: 'cyan',
        0.7: 'lime',
        0.8: 'yellow',
        1.0: 'red'
      }
    };
  }

  /**
   *
   * @param {number} blur
   */
  setBlur(blur) {
    this.parameters.blur = blur;
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
    const minX = this.decimalAdjust('floor', longitude, degreeExp);
    const minY = this.decimalAdjust('floor', latitude, degreeExp);
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

    const nw = point([minX, maxY]);
    const ne = point([maxX, maxY]);
    const sw = point([minX, minY]);
    const se = point([maxX, minY]);

    const km1 = distance(nw, ne);
    const km2 = distance(nw, sw);
    const km3 = distance(sw, se);

    const radians = Math.asin((km3 - km1) / km2);
    return {
      min: { longitude: minX, latitude: minY },
      max: { longitude: maxX, latitude: maxY },
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
   * @param {'round' | 'floor' | 'ceil'} type
   * @param {number} value
   * @param {number} [exp]
   */
  decimalAdjust(type, value, exp = 0) {
    const expValue = Math.abs(value).toExponential().split('e');
    const shiftValue = +`${expValue[0]}e${+expValue[1] + exp}`;
    const floorValue = Math[type](shiftValue).toExponential().split('e');
    const reverseValue = +`${floorValue[0]}e${+floorValue[1] - exp}`;

    return reverseValue * (value < 0 ? -1 : 1);
  }

  /**
   *
   * @param {{all: Set<{latitude: number, longitude: number}>, bounds: {min: {latitude: number, longitude: number}, size: number, max: {latitude: number, longitude: number}, radians: number}, points: Set<{latitude: number, longitude: number}>}} block
   * @return {import('canvas').Canvas}
   */
  draw(block) {
    const { size, radius, blur, gradient } = this.parameters;
    const points = Array.from(block.all).map((p) => {
      const origin = point([p.longitude, p.latitude]);
      const originLeft = point([block.bounds.min.longitude, p.latitude]);
      const originBottom = point([p.longitude, block.bounds.min.latitude]);
      const q1 = distance(originLeft, origin);
      const q3 = distance(origin, originBottom);
      const q2 = q3 * Math.sin(block.bounds.radians);
      const q4 = q3 * Math.cos(block.bounds.radians);

      // Adjust x coordinate error because of length between two point in
      // northen(/southern) are shorter than in equator
      const x = Math.round(((q1 + q2) / block.bounds.size) * size);
      const y = size - Math.round((q4 / block.bounds.size) * size);
      return [x, y];
    });

    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    if (blur !== 0) {
      ctx.shadowOffsetY = ctx.shadowOffsetX = 0;
      ctx.shadowBlur = blur + radius;
      ctx.shadowColor = 'rgba(0,0,0,0.06)';
      ctx.fillStyle = 'rgba(0,0,0,0.02)';
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.042)';
    }

    for (const point of points) {
      const [x, y] = point;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    }

    if (blur === 0) {
      const blurData = StackBlur.imageDataRGBA(
        ctx.getImageData(0, 0, size, size),
        0,
        0,
        size,
        size,
        2
      );
      ctx.putImageData(blurData, 0, 0);
    }

    // Create gradient data with list of gradient stop color
    const gradientCanvas = createCanvas(1, 256);
    const gradientCtx = gradientCanvas.getContext('2d');
    const linearGradient = gradientCtx.createLinearGradient(0, 0, 0, 256);

    for (const weight in gradient) {
      linearGradient.addColorStop(parseFloat(weight), gradient[weight]);
    }
    gradientCtx.fillStyle = linearGradient;
    gradientCtx.fillRect(0, 0, 1, 256);
    const shades = gradientCtx.getImageData(0, 0, 1, 256).data;

    const pixels = ctx.getImageData(0, 0, size, size);
    // Each pixel live in 4 indexes
    for (let i = 0; i < pixels.data.length; i += 4) {
      const opacityLevel = pixels.data[i + 3] * 4;
      if (opacityLevel) {
        pixels.data[i] = shades[opacityLevel];
        pixels.data[i + 1] = shades[opacityLevel + 1];
        pixels.data[i + 2] = shades[opacityLevel + 2];
      }
    }
    ctx.putImageData(pixels, 0, 0);

    const cropSize = size / 3;
    const crop = createCanvas(cropSize, cropSize);
    const cropContext = crop.getContext('2d');

    cropContext.drawImage(
      canvas,
      cropSize,
      cropSize,
      cropSize,
      cropSize,
      0,
      0,
      cropSize,
      cropSize
    );
    return crop;
  }

  /**
   *
   * @param {string} dir
   * @param {import('./types').Blocks} blocks
   */
  write(dir, blocks) {
    try {
      fs.accessSync(dir);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      fs.mkdirSync(dir);
    }
    const nonEmptyBlocks = Object.keys(blocks).filter(
      (block) => blocks[block].points.size > 0
    );
    for (const block of nonEmptyBlocks) {
      const path = `${dir}/${block}.png`;
      const canvas = this.draw(blocks[block]);
      fs.writeFileSync(path, canvas.toBuffer());
    }
  }
}

module.exports = MapHeat;
