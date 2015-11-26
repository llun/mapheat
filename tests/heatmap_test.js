'use strict'

let chai = require('chai')
  , fs = require('fs-extra')
  , crypto = require('crypto')
  , Canvas = require('canvas')

let expect = chai.expect
  , Image = Canvas.Image

let Heatmap = require('../lib/heatmap.js')

describe('Heatmap', () => {

  describe('#constructor', () => {

    it ('sets default values', () => {
      let heatmap = new Heatmap
      expect(heatmap.options).to.deep.equal({
        size: 3000
      })
    })

  })

  describe('#key', () => {

    let heatmap = null
      , location = { longitude: 103.412, latitude: 12.5231 }

    beforeEach(() => {
      heatmap = new Heatmap
    })

    it ('returns key contains all boundary points in it', () => {
      expect(heatmap.key(location)).to.equal(`103.4,12.5,103.5,12.6`)
    })

    it ('returns key same as current boundary', () => {
      expect(heatmap.key(location, Heatmap.CENTER)).to.equal(`103.4,12.5,103.5,12.6`)
    })

    it ('returns boundary key above the current boundary', () => {
      expect(heatmap.key(location, Heatmap.TOP)).to.equal(`103.4,12.6,103.5,12.7`)
    })

    it ('returns boundary key next to the current boundary', () => {
      expect(heatmap.key(location, Heatmap.RIGHT)).to.equal(`103.5,12.5,103.6,12.6`)
    })

    it ('returns boundary key below the current boundary', () => {
      expect(heatmap.key(location, Heatmap.BOTTOM)).to.equal(`103.4,12.4,103.5,12.5`)
    })

    it ('returns boundary key left to the current boundary', () => {
      expect(heatmap.key(location, Heatmap.LEFT)).to.equal(`103.3,12.5,103.4,12.6`)
    })

  })

  describe('#bounds', () => {

    let key = '103.4,12.5,103.5,12.6'
      , heatmap = null
    beforeEach(() => {
      heatmap = new Heatmap
    })

    it ('returns all values in the key and radians', () => {
      expect(heatmap.bounds(key)).to.deep.equal({
        min: { x: 103.3, y: 12.4 },
        max: { x: 103.6, y: 12.7 },
        canvas: {
          min: { x: 103.4, y: 12.5 },
          max: { x: 103.5, y: 12.6 }
        },
        radians: 0.0011377370489601272,
        size: 32.59052667505927
      })
    })

  })

  describe('#addPoint', () => {

    let heatmap = null
      , point = { longitude: 103.412, latitude: 12.5231 }

    beforeEach(() => {
      heatmap = new Heatmap
      heatmap.addPoint(point, heatmap._blocks)
    })

    it ('adds point to all and points in center box', () => {
      let key = '103.4,12.5,103.5,12.6'
      expect(heatmap._blocks).to.include.keys(key)
      expect(heatmap._blocks[key].all.size).to.equal(1)
      expect(heatmap._blocks[key].points.size).to.equal(1)
    })

    it ('adds point to all in boxes around the center', () => {
      let keys = ['103.4,12.4,103.5,12.5', '103.5,12.5,103.6,12.6',
        '103.4,12.6,103.5,12.7', '103.3,12.5,103.4,12.6']
      keys.forEach(key => {
        expect(heatmap._blocks).to.include.keys(key)
        expect(heatmap._blocks[key].all.size).to.equal(1)
        expect(heatmap._blocks[key].points.size).to.equal(0)
      })
    })

    it ('adds only one point to the box for same coordinate', () => {
      let block = {}

      heatmap.addPoint(point, block)
      heatmap.addPoint(point, block)

      expect(block['103.4,12.5,103.5,12.6'].points.size).to.equal(1)
      expect(block['103.4,12.5,103.5,12.6'].all.size).to.equal(1)
    })

  })

  describe('#draw', () => {

    let heatmap = null

    beforeEach(() => {
      heatmap = new Heatmap
    })

    it ('draws the block and returns an image', () => {
      let block = {
        points: new Set([{ longitude: 103.412, latitude: 12.5231 }]),
        all: new Set([{ longitude: 103.412, latitude: 12.5231 }]),
        bounds: { min: { x: 103.3, y: 12.4 }, max: { x: 103.6, y: 12.7 }, radians: 0.0011377370489601272, size: 32.59052667505927 }
      }

      let canvas = heatmap.draw(block)

      let hash1 = crypto.createHash('md5')
      hash1.update(canvas.toBuffer())

      let hash2 = crypto.createHash('md5')
      hash2.update(fs.readFileSync(`${__dirname}/blank.png`))

      expect(hash2.digest('hex')).to.equal(hash1.digest('hex'))
    })

  })

  describe('with data', function() {

    this.timeout(10000)
    let heatmap = null

    before(() => {
      heatmap = new Heatmap

      let data = fs.readFileSync(__dirname + '/data.json', { encoding: 'utf-8' })
      heatmap.import(JSON.parse(data))
    })

    describe('#blocks', () => {

      it ('returns all blocks that have data', () => {
        expect(heatmap.blocks().length).to.equal(2)
      })

      it ('returns block object', () => {
        let block = heatmap.blocks()[0]
        expect(block).to.have.all.keys('key', 'points', 'all', 'bounds')
      })

    })

    describe('#import', () => {

      it ('adds all data points to blocks', () => {
        expect(heatmap.blocks().length).to.equal(2)
      })

    })

    describe('#write', () => {
      let dir = `${__dirname}/blocks`

      before((done) => {
        heatmap.write(dir, done)
      })

      after((done) => {
        fs.remove(dir, done)
      })

      it ('creates a directory and write all block images to that directory', (done) => {
        fs.access(dir, error => {
          expect(error).to.be.nil
          done()
        })
      })

      it ('writes only block that contain points to file', (done) => {
        fs.readdir(dir, (error, files) => {
          expect(files.length).to.equal(2)
          done()
        })
      })

      it ('draws correct part to the file', () => {
        let blocks = ['103.8,1.2,103.9,1.3.png', '103.8,1.3,103.9,1.4.png']
        blocks.forEach(block => {
          let hash1 = crypto.createHash('md5')
          hash1.update(fs.readFileSync(`${__dirname}/${block}`))

          let hash2 = crypto.createHash('md5')
          hash2.update(fs.readFileSync(`${dir}/${block}`))

          expect(hash2.digest('hex')).to.equal(hash1.digest('hex'))
        })
      })

    })

  })

})
