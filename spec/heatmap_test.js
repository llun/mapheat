'use strict';

const fs = require('fs-extra');
const crypto = require('crypto');

const Heatmap = require('../lib/heatmap.js');

describe('Heatmap', () => {
  describe('#constructor', () => {
    it('sets default values', () => {
      const heatmap = new Heatmap;
      expect(heatmap.options).toEqual({
        size: 3000,
      });
    });
  });

  describe('#key', () => {
    let heatmap = null;
    const location = { longitude: 103.412, latitude: 12.5231 };

    beforeEach(() => {
      heatmap = new Heatmap;
    });

    it('returns key contains all boundary points in it', () => {
      expect(heatmap.key(location)).toEqual('103.4,12.5,103.5,12.6');
    });

    it('returns key same as current boundary', () => {
      expect(heatmap.key(location, Heatmap.CENTER)).toEqual('103.4,12.5,103.5,12.6');
    });

    it('returns boundary key above the current boundary', () => {
      expect(heatmap.key(location, Heatmap.TOP)).toEqual('103.4,12.6,103.5,12.7');
    });

    it('returns boundary key next to the current boundary', () => {
      expect(heatmap.key(location, Heatmap.RIGHT)).toEqual('103.5,12.5,103.6,12.6');
    });

    it('returns boundary key below the current boundary', () => {
      expect(heatmap.key(location, Heatmap.BOTTOM)).toEqual('103.4,12.4,103.5,12.5');
    });

    it('returns boundary key left to the current boundary', () => {
      expect(heatmap.key(location, Heatmap.LEFT)).toEqual('103.3,12.5,103.4,12.6');
    });
  });

  describe('#bounds', () => {
    const key = '103.4,12.5,103.5,12.6';
    let heatmap = null;
    beforeEach(() => {
      heatmap = new Heatmap;
    });

    it('returns all values in the key and radians', () => {
      expect(heatmap.bounds(key)).toEqual({
        min: { x: 103.3, y: 12.4 },
        max: { x: 103.6, y: 12.7 },
        canvas: {
          min: { x: 103.4, y: 12.5 },
          max: { x: 103.5, y: 12.6 },
        },
        radians: 0.0011377370489601272,
        size: 32.59052667505927,
      });
    });
  });

  describe('#addPoint', () => {
    const point = { longitude: 103.412, latitude: 12.5231 };
    let heatmap = null;

    beforeEach(() => {
      heatmap = new Heatmap;
      heatmap.addPoint(point, heatmap._blocks);
    });

    it('adds point to all and points in center box', () => {
      const key = '103.4,12.5,103.5,12.6';
      expect(Object.keys(heatmap._blocks)).toContain(key);
      expect(heatmap._blocks[key].all.size).toEqual(1);
      expect(heatmap._blocks[key].points.size).toEqual(1);
    });

    it('adds point to all in boxes around the center', () => {
      const keys = ['103.4,12.4,103.5,12.5', '103.5,12.5,103.6,12.6',
        '103.4,12.6,103.5,12.7', '103.3,12.5,103.4,12.6'];
      keys.forEach(key => {
        expect(Object.keys(heatmap._blocks)).toContain(key);
        expect(heatmap._blocks[key].all.size).toEqual(1);
        expect(heatmap._blocks[key].points.size).toEqual(0);
      });
    });

    it('adds only one point to the box for same coordinate', () => {
      const block = {};

      heatmap.addPoint(point, block);
      heatmap.addPoint(point, block);

      expect(block['103.4,12.5,103.5,12.6'].points.size).toEqual(1);
      expect(block['103.4,12.5,103.5,12.6'].all.size).toEqual(1);
    });
  });

  describe('#draw', () => {
    let heatmap = null;

    beforeEach(() => {
      heatmap = new Heatmap;
    });

    it('draws the block and returns an image', () => {
      const block = {
        points: new Set([{ longitude: 103.412, latitude: 12.5231 }]),
        all: new Set([{ longitude: 103.412, latitude: 12.5231 }]),
        bounds: {
          min: { x: 103.3, y: 12.4 },
          max: { x: 103.6, y: 12.7 },
          radians: 0.0011377370489601272,
          size: 32.59052667505927,
        },
      };

      const canvas = heatmap.draw(block);

      const hash1 = crypto.createHash('md5');
      hash1.update(canvas.toBuffer());

      const hash2 = crypto.createHash('md5');
      hash2.update(fs.readFileSync(`${__dirname}/blank.png`));

      expect(hash2.digest('hex')).toEqual(hash1.digest('hex'));
    });
  });

  describe('with data', () => {
    let heatmap = null;

    beforeAll(() => {
      heatmap = new Heatmap;

      const data = fs.readFileSync(`${__dirname}/data.json`, { encoding: 'utf-8' });
      heatmap.import(JSON.parse(data));
    });

    describe('#blocks', () => {
      it('returns all blocks that have data', () => {
        expect(heatmap.blocks().length).toEqual(2);
      });

      it('returns block object', () => {
        const block = heatmap.blocks()[0];
        ['key', 'points', 'all', 'bounds'].forEach(item => {
          expect(Object.keys(block)).toContain(item);
        });
      });
    });

    describe('#import', () => {
      it('adds all data points to blocks', () => {
        expect(heatmap.blocks().length).toEqual(2);
      });
    });

    describe('#write', () => {
      const dir = `${__dirname}/blocks`;

      beforeAll((done) => {
        heatmap.write(dir, done);
      });

      afterAll((done) => {
        fs.remove(dir, done);
      });

      it('creates a directory and write all block images to that directory', (done) => {
        fs.access(dir, error => {
          expect(error).toBeNull();
          done();
        });
      });

      it('writes only block that contain points to file', (done) => {
        fs.readdir(dir, (error, files) => {
          expect(files.length).toEqual(2);
          done();
        });
      });

      it('draws correct part to the file', () => {
        const blocks = ['103.8,1.2,103.9,1.3.png', '103.8,1.3,103.9,1.4.png'];
        blocks.forEach(block => {
          const hash1 = crypto.createHash('md5');
          hash1.update(fs.readFileSync(`${__dirname}/${block}`));

          const hash2 = crypto.createHash('md5');
          hash2.update(fs.readFileSync(`${dir}/${block}`));

          expect(hash2.digest('hex')).toEqual(hash1.digest('hex'));
        });
      });
    });
  });
});
