import * as _ from 'lodash'
import * as THREE from 'three'

export type LineOpts = {
  material?: MaterialOpts
  scaleX?: number
  scaleY?: number
}

export type MaterialOpts = {
  linewidth?: number
  color?: number
}

export class Line {
  positions: Float32Array
  public obj: THREE.Line
  private opts: { material: {} }
  constructor(positions: Array<number>, opts: { material: MaterialOpts }) {
    this.opts = {
      material: {},
      ...opts,
    }

    const geometry = new THREE.BufferGeometry()
    geometry.addAttribute(
      'position',
      new THREE.BufferAttribute(
        (this.positions = Float32Array.from(positions)),
        3,
      ),
    )

    var material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      linewidth: 2,
      ...this.opts.material,
    })

    this.obj = new THREE.Line(geometry, material)
  }
}

export class SignalLine {
  length: number
  positions: Float32Array

  public _scaleX: number = 1
  public _scaleY: number = 1
  public obj: THREE.Object3D
  public line: THREE.Line
  public verbose: boolean = false

  private geometry: THREE.BufferGeometry
  private material: THREE.LineBasicMaterial

  opts: { material: {} }

  constructor(length: number, opts: LineOpts) {
    this.length = length
    this.opts = this.initOpts(opts)

    // geometry
    const geometry = (this.geometry = new THREE.BufferGeometry())

    // attributes
    const positions = new Float32Array(length * 3)
    this.positions = positions

    _.times(length, (index: number) => {
      positions[index * 3] = (1 / length) * index
      positions[index * 3 + 1] = 0
      positions[index * 3 + 2] = 0
    })

    geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3))

    // draw range
    geometry.setDrawRange(0, length - 1)

    var material = (this.material = this.initMaterial(opts.material))
    this.obj = new THREE.Object3D()
    this.obj.add((this.line = new THREE.Line(geometry, material)))
  }

  set scaleX(newScale: number) {
    this._scaleX = newScale
    this.resize()
  }

  set scaleY(newScale: number) {
    this._scaleY = newScale
    this.resize()
  }

  initMaterial(opts = {}) {
    return new THREE.LineBasicMaterial({
      color: 0xffffff,
      linewidth: 2,
      ...opts,
    })
  }

  initOpts(opts = {}) {
    return {
      material: {},
      ...opts,
    }
  }

  display(data: Uint8Array) {
    // @ts-ignore
    _.times(this.length, index => {
      const normalized = data[index] / 256 || 0
      this.positions[index * 3 + 1] = normalized
    })
    // @ts-ignore
    this.line.geometry.attributes.position.needsUpdate = true
  }

  dispose() {
    this.geometry.dispose()
    this.material.dispose()
  }

  resize() {
    const zoomedLength = Math.round(this.length * this._scaleX)
    // @ts-ignore
    this.line.geometry.setDrawRange(0, zoomedLength - 1)
    this.line.scale.set(1 / this._scaleX, this._scaleY * 2, 1)
  }
}

type Painter = (value: number) => [number, number, number]

export class SignalLineColor extends SignalLine {
  private painter?: Painter

  constructor(length: number, opts: { painter?: Painter } & LineOpts = {}) {
    const { painter, ...subOpts } = opts
    super(length, subOpts)
    this.painter = painter
  }

  defaultPainter(value: number) {
    const color = new THREE.Color()
    color.setHSL(value, 0.9, value)
    return [color.r, color.g, color.b]
  }

  set scaleX(newScale: number) {
    this._scaleX = newScale
    this.resize()
  }

  set scaleY(newScale: number) {
    this._scaleY = newScale
    this.resize()
  }

  display(data: Uint8Array) {
    const colors: Array<number> = []

    _.times(this.length, index => {
      const normalized = data[index] / 256 || 0

      this.positions[index * 3 + 1] = normalized
      colors.push(
        ...(this.painter
          ? this.painter(normalized)
          : this.defaultPainter(normalized)),
      )
    })

    // @ts-ignore
    this.line.geometry.addAttribute(
      'color',
      new THREE.Float32BufferAttribute(colors, 3),
    )

    // @ts-ignore
    this.line.geometry.attributes.position.needsUpdate = true
  }

  initMaterial() {
    return new THREE.LineBasicMaterial({
      color: 0xffffff,
      linewidth: 2,
      vertexColors: THREE.VertexColors,
      ...this.opts.material,
    })
  }
}
