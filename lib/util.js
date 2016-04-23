'use strict';

module.exports = {
  floor(value, exp) {
    exp = exp || 0;

    const expValue = Math.abs(value).toExponential().split('e');
    const shiftValue = +`${expValue[0]}e${+expValue[1] + exp}`;
    const floorValue = Math.floor(shiftValue).toExponential().split('e');
    const reverseValue = +`${floorValue[0]}e${+floorValue[1] - exp}`;

    return reverseValue * ((value < 0) ? -1 : 1);
  },
};
