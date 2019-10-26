import * as _ from 'lodash'
import * as THREE from 'three'
import { Line, SignalLineColor } from './lines'

const POINTS = 256

export class FFT {
  public obj: THREE.Object3D
  private _cutoff: number = 0.8
  private _scaleX: number = 1
  private _scaleY: number = 0.5

  private history: FFThistory
  private signalLine: SignalLineColor
  private cutoffLine: Line

  painter(value: number): [number, number, number] {
    if (value > this._cutoff) {
      return [1, 0, 0]
    }
    const color = new THREE.Color()
    color.setHSL(value, 0.9, value)
    return [color.r, color.g, color.b]
  }

  constructor() {
    this.obj = new THREE.Object3D()

    this.signalLine = new SignalLineColor(POINTS, {
      painter: this.painter.bind(this),
      material: { linewidth: 15 },
    })

    this.signalLine.verbose = true

    this.signalLine.obj.scale.set(1, 4, 1)
    this.signalLine.obj.translateY(-0.1)
    this.signalLine.obj.translateZ(0.05)
    this.obj.add(this.signalLine.obj)

    this.history = new FFThistory(this)
    this.obj.add(this.history.obj)

    // this.obj.add(
    //   new Line([0, 0, 0, 1, 0, 0, 1, 10, -5, 0, 10, -5, 0, 0, 0], {
    //     material: {
    //       color: 0x555555,
    //     },
    //   }).obj,
    // )

    this.cutoffLine = new Line([0, 0, 0, 1, 0, 0], {
      material: { color: 0xff0000, linewidth: 4 },
    })

    this.cutoffLine.obj.scale.set(1, 3, 5)
    this.cutoffLine.obj.translateY(this.cutoff * 3 - 0.1)
    this.obj.add(this.cutoffLine.obj)
  }

  set cutoff(newCutoff: number) {
    this.cutoffLine.obj.position.set(0, newCutoff * 3, 0)
    this._cutoff = newCutoff
  }

  set scaleX(newScale: number) {
    this._scaleX = this.history.scaleX = this.signalLine.scaleX = newScale
  }

  set scaleY(newScale: number) {
    this._scaleY = this.history.scaleY = this.signalLine.scaleY = newScale
  }

  display(data: Uint8Array) {
    this.signalLine.scaleX = this._scaleX
    this.signalLine.scaleY = this._scaleY
    this.signalLine.display(data)
    this.history.scaleX = this._scaleX
    this.history.scaleY = this._scaleY
    this.history.display(data)
  }
}

export class FFThistory {
  public obj: THREE.Object3D
  private _scaleX: number = 1
  private _scaleY: number = 1
  private signalLines: SignalLineColor[] = []
  private fft: FFT

  constructor(fft: FFT) {
    this.fft = fft
    this.obj = new THREE.Object3D()
  }

  display(data: Uint8Array) {
    const signalLine = new SignalLineColor(POINTS, {
      painter: this.fft.painter.bind(this.fft),
    })

    signalLine.obj.scale.set(1, 4, 1)
    signalLine.scaleX = this._scaleX
    signalLine.scaleY = this._scaleY
    signalLine.display(data)

    if (this.signalLines.length > 200) {
      const toDelete = this.signalLines.shift()
      if (toDelete) {
        this.obj.remove(toDelete.obj)
        toDelete.dispose()
      }
    }

    _.each(this.signalLines, line => {
      line.obj.translateY(0.05)
      line.obj.translateZ(-0.025)
    })

    this.signalLines.push(signalLine)
    this.obj.add(signalLine.obj)
  }

  set scaleX(newScale: number) {
    this._scaleX = newScale
    this.signalLines.forEach(signalLine => (signalLine.scaleX = newScale))
  }

  set scaleY(newScale: number) {
    this._scaleY = newScale
    this.signalLines.forEach(signalLine => (signalLine.scaleY = newScale))
  }
}
