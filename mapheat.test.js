// @ts-check
const fs = require("fs");
const crypto = require("crypto");
const test = require("ava").default;

const MapHeat = require("./mapheat");

/**
 * @typedef {{ mapheat: MapHeat }} Context
 */
test.beforeEach((t) => {
  t.context = {
    mapheat: new MapHeat(),
  };
});

test("MapHeat#key", (t) => {
  const { mapheat } = /** @type {Context} */ (t.context);
  const location = /** @type {import('./types').Point} */ ({
    longitude: 103.412,
    latitude: 12.5231,
  });

  t.is(mapheat.key(location), "103.4,12.5,103.5,12.6");
  t.is(mapheat.key(location, "center"), "103.4,12.5,103.5,12.6");
  t.is(mapheat.key(location, "left"), "103.3,12.5,103.4,12.6");
  t.is(mapheat.key(location, "right"), "103.5,12.5,103.6,12.6");
  t.is(mapheat.key(location, "top"), "103.4,12.6,103.5,12.7");
  t.is(mapheat.key(location, "bottom"), "103.4,12.4,103.5,12.5");
});

test("MapHeat#decimalAdjust", (t) => {
  const { mapheat } = /** @type {Context} */ (t.context);
  const value = 123.4432;

  t.is(mapheat.decimalAdjust(value), 123);
  t.is(mapheat.decimalAdjust(value, 1), 123.4);
  t.is(mapheat.decimalAdjust(value, 2), 123.44);
  t.is(mapheat.decimalAdjust(-value), -123);
  t.is(mapheat.decimalAdjust(-value, 1), -123.4);
});
