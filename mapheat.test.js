// @ts-check
const fs = require('fs');
const crypto = require('crypto');
const test = require('ava').default;

const MapHeat = require('./mapheat');

/**
 * @typedef {{ mapheat: MapHeat }} Context
 */
test.beforeEach((t) => {
  t.context = {
    mapheat: new MapHeat()
  };
});

test('MapHeat#key', (t) => {
  const { mapheat } = /** @type {Context} */ (t.context);
  const location = /** @type {import('./types').Point} */ ({
    longitude: 103.412,
    latitude: 12.5231
  });

  t.is(mapheat.key(location), '103.4,12.5,103.5,12.6');
  t.is(mapheat.key(location, 'center'), '103.4,12.5,103.5,12.6');
  t.is(mapheat.key(location, 'left'), '103.3,12.5,103.4,12.6');
  t.is(mapheat.key(location, 'right'), '103.5,12.5,103.6,12.6');
  t.is(mapheat.key(location, 'top'), '103.4,12.6,103.5,12.7');
  t.is(mapheat.key(location, 'bottom'), '103.4,12.4,103.5,12.5');
});

test('MapHeat#decimalAdjust', (t) => {
  const { mapheat } = /** @type {Context} */ (t.context);
  const value = 123.4432;

  t.is(mapheat.decimalAdjust('floor', value), 123);
  t.is(mapheat.decimalAdjust('floor', value, 1), 123.4);
  t.is(mapheat.decimalAdjust('floor', value, 2), 123.44);
  t.is(mapheat.decimalAdjust('floor', -value), -123);
  t.is(mapheat.decimalAdjust('floor', -value, 1), -123.4);
});

test('MapHeat#bounds', (t) => {
  const { mapheat } = /** @type {Context} */ (t.context);
  const key = '103.4,12.5,103.5,12.6';

  t.deepEqual(mapheat.bounds(key), {
    min: { longitude: 103.3, latitude: 12.4 },
    max: { longitude: 103.6, latitude: 12.7 },
    radians: 0.0011377370489601083,
    size: 32.580343989241705
  });
});

test('MapHeat#addPoint', (t) => {
  const { mapheat } = /** @type {Context} */ (t.context);
  const blocks = /** @type {import('./types').Blocks} */ ({});
  const point = { longitude: 103.412, latitude: 12.5231 };
  const key = '103.4,12.5,103.5,12.6';

  mapheat.addPoint(point, blocks);
  t.true(Object.keys(blocks).includes(key));
  t.is(blocks[key].all.size, 1);
  t.is(blocks[key].points.size, 1);

  const keys = [
    '103.4,12.4,103.5,12.5',
    '103.5,12.5,103.6,12.6',
    '103.4,12.6,103.5,12.7',
    '103.3,12.5,103.4,12.6'
  ];
  for (const key of keys) {
    t.is(blocks[key].points.size, 0);
  }

  mapheat.addPoint(point, blocks);
  t.is(blocks[key].all.size, 1);
  t.is(blocks[key].points.size, 1);
});

test('MapHeat#draw', (t) => {
  const { mapheat } = /** @type {Context} */ (t.context);
  const block = /** @type {import('./types').Block} */ ({
    points: new Set([{ longitude: 103.412, latitude: 12.5231 }]),
    all: new Set([{ longitude: 103.412, latitude: 12.5231 }]),
    bounds: {
      min: {
        longitude: 103.3,
        latitude: 12.4
      },
      max: {
        longitude: 103.6,
        latitude: 12.7
      },
      radians: 0.0011377370489601272,
      size: 32.59052667505927
    }
  });
  const canvas = mapheat.draw(block);
  const hash1 = crypto.createHash('md5');
  hash1.update(canvas.toBuffer());
  const hash2 = crypto.createHash('md5');
  hash2.update(fs.readFileSync(`${__dirname}/spec/blank.png`));
  t.is(hash2.digest('hex'), hash1.digest('hex'));
});

test('MapHeat#write without blur', (t) => {
  t.teardown(() => {
    const dir = `${__dirname}/spec/blocks`;
    try {
      fs.accessSync(dir);
      const blocksDir = fs.readdirSync(dir);
      for (const file of blocksDir) {
        fs.unlinkSync(`${dir}/${file}`);
      }
      fs.rmdirSync(dir);
    } catch (error) {
      // Ignore non-exist blocks
    }
  });
  const { mapheat } = /** @type {Context} */ (t.context);
  mapheat.setBlur(0);
  const blocks = /** @type {import('./types').Blocks} */ ({});
  const data = JSON.parse(
    fs.readFileSync(`${__dirname}/spec/data.json`).toString('utf-8')
  );
  for (const point of data) {
    mapheat.addPoint(point, blocks);
  }

  const dir = `${__dirname}/spec/blocks`;
  mapheat.write(dir, blocks);
  t.notThrows(() => {
    fs.accessSync(dir);
  }, 'MapHeat should create dir when writes blocks');

  t.is(fs.readdirSync(dir).length, 2, 'Generate more than expected tiles');

  const file1 = '103.8,1.2,103.9,1.3.png';
  const file1hash1 = crypto.createHash('md5');
  file1hash1.update(fs.readFileSync(`${__dirname}/spec/${file1}`));
  const file1hash2 = crypto.createHash('md5');
  file1hash2.update(fs.readFileSync(`${dir}/${file1}`));
  const file1hash1Hex = file1hash1.digest('hex');
  const file1hash2Hex = file1hash2.digest('hex');
  t.is(
    file1hash1Hex,
    file1hash2Hex,
    `fail block 1 (${file1hash1Hex} <> ${file1hash2Hex})`
  );

  const file2 = '103.8,1.3,103.9,1.4.png';
  const file2hash1 = crypto.createHash('md5');
  file2hash1.update(fs.readFileSync(`${__dirname}/spec/${file2}`));
  const file2hash2 = crypto.createHash('md5');
  file2hash2.update(fs.readFileSync(`${dir}/${file2}`));

  const file2hash1Hex = file2hash1.digest('hex');
  const file2hash2Hex = file2hash2.digest('hex');
  t.is(
    file2hash1Hex,
    file2hash2Hex,
    `fail block 2 (${file2hash1Hex} <> ${file2hash2Hex})`
  );
});

test.skip('MapHeat#write with blur', (t) => {
  t.teardown(() => {
    const dir = `${__dirname}/spec/blur_blocks`;
    try {
      fs.accessSync(dir);
      const blocksDir = fs.readdirSync(dir);
      for (const file of blocksDir) {
        fs.unlinkSync(`${dir}/${file}`);
      }
      fs.rmdirSync(dir);
    } catch (error) {
      // Ignore non-exist blocks
    }
  });
  const { mapheat } = /** @type {Context} */ (t.context);
  mapheat.setBlur(3);
  const blocks = /** @type {import('./types').Blocks} */ ({});
  const data = JSON.parse(
    fs.readFileSync(`${__dirname}/spec/data.json`).toString('utf-8')
  );
  for (const point of data) {
    mapheat.addPoint(point, blocks);
  }

  const dir = `${__dirname}/spec/blur_blocks`;
  mapheat.write(dir, blocks);
  t.notThrows(() => {
    fs.accessSync(dir);
  }, 'MapHeat should create dir when writes blocks');

  t.is(fs.readdirSync(dir).length, 2);

  const file1 = '103.8,1.2,103.9,1.3.png';
  const file1hash1 = crypto.createHash('md5');
  file1hash1.update(fs.readFileSync(`${__dirname}/spec/blur_${file1}`));
  const file1hash2 = crypto.createHash('md5');
  file1hash2.update(fs.readFileSync(`${dir}/${file1}`));
  t.is(file1hash2.digest('hex'), file1hash1.digest('hex'));

  const file2 = '103.8,1.3,103.9,1.4.png';
  const file2hash1 = crypto.createHash('md5');
  file2hash1.update(fs.readFileSync(`${__dirname}/spec/blur_${file2}`));
  const file2hash2 = crypto.createHash('md5');
  file2hash2.update(fs.readFileSync(`${dir}/${file2}`));
  t.is(file2hash2.digest('hex'), file2hash1.digest('hex'));
});
