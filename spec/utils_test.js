'use strict';
const util = require('../lib/util');

describe('util', () => {
  describe('#floor', () => {
    const value = 123.4432;

    it('returns floor value with no digit after dot', () => {
      expect(util.floor(value)).toEqual(123);
    });

    it('returns floor value with 1 digit after dot', () => {
      expect(util.floor(value, 1)).toEqual(123.4);
    });

    it('returns floor value with 2 digits after dot', () => {
      expect(util.floor(value, 2)).toEqual(123.44);
    });

    it('returns negative floor value with no digits after dot', () => {
      expect(util.floor(-value)).toEqual(-123);
    });

    it('returns negative floor value with 1 digit after dot', () => {
      expect(util.floor(-value, 1)).toEqual(-123.4);
    });
  });
});
