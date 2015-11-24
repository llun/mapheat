'use strict'

module.exports = {
  floor(value, exp) {
    exp = exp || 0

    let expValue = Math.abs(value).toExponential().split('e')
      , shiftValue = +`${expValue[0]}e${+expValue[1] + exp}`
      , floorValue = Math.floor(shiftValue).toExponential().split('e')
      , reverseValue = +`${floorValue[0]}e${+floorValue[1] - exp}`

    return reverseValue * ((value < 0) ? -1 : 1)
  }
}
