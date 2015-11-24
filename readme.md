#Mapheat

Create images for overlaying on the map.

## Usage

```js
var mapheat = require('mapheat')
var instance = new mapheat()
instance.addPoint({ longitude: 103.412, latitude: 12.5231 })
instance.write('images/', (error, filePaths) => {
  console.log (filePaths)
})
```
