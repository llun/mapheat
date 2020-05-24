# Mapheat

Create heatmap images for overlaying on the map

## Usage

```js
const mapheat = require('mapheat');
const instance = new mapheat();
instance.setBlur(3);
const blocks = {};
instance.addPoint({ longitude: 103.412, latitude: 12.5231 }, blocks);
instance.write('images/', blocks);
```
