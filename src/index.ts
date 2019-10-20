import * as _ from 'lodash'
import * as THREE from 'three'

// @ts-ignore
import * as tone from 'tone'
// @ts-ignore
import * as pitchy from 'pitchy'

import { Line, SignalLine, SignalLineColor } from './lines'

const POINTS = 256

const env: {
  renderer?: THREE.WebGLRenderer
  camera?: THREE.PerspectiveCamera
  scene?: THREE.Scene
} = {}

class FFT {
  public obj: THREE.Object3D
  private _cutoff: number = 0.8
  private _zoom: number = 1

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
      material: { color: 0xff0000, linewidth: 2 },
    })

    this.cutoffLine.obj.scale.set(1, 3, 5)
    this.cutoffLine.obj.translateY(this.cutoff * 3 - 0.1)
    this.obj.add(this.cutoffLine.obj)
  }

  set cutoff(newCutoff: number) {
    this.cutoffLine.obj.position.set(0, newCutoff * 3, 0)
    this._cutoff = newCutoff
  }

  set zoom(newZoom: number) {
    this._zoom = this.history.zoom = this.signalLine.zoom = newZoom
  }

  display(data: Uint8Array) {
    this.signalLine.zoom = this._zoom
    this.signalLine.display(data)
    this.history.zoom = this._zoom
    this.history.display(data)
  }
}

class FFThistory {
  public obj: THREE.Object3D
  private _zoom: number = 1
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
    signalLine.zoom = this._zoom
    signalLine.display(data)

    if (this.signalLines.length > 100) {
      const toDelete = this.signalLines.shift()
      if (toDelete) {
        this.obj.remove(toDelete.obj)
        toDelete.dispose()
      }
    }

    _.each(this.signalLines, line => {
      line.obj.translateY(0.1)
      line.obj.translateZ(-0.05)
    })

    this.signalLines.push(signalLine)
    this.obj.add(signalLine.obj)
  }

  set zoom(newZoom: number) {
    this._zoom = newZoom
    this.signalLines.forEach(signalLine => (signalLine.zoom = newZoom))
  }
}

class WaveView {
  public obj: THREE.Object3D
  private linewave: SignalLine
  constructor() {
    this.obj = new THREE.Object3D()

    this.linewave = new SignalLine(POINTS, {
      material: { color: 0xdddddd, linewidth: 5 },
    })
    this.linewave.obj.scale.set(20, 8, 1)
    this.linewave.obj.position.set(-10, -4, 0)

    this.obj.add(this.linewave.obj)
  }

  display(data: Uint8Array) {
    this.linewave.display(data)
  }
}

function init() {
  env.camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    30,
  )
  env.camera.position.z = 10

  env.scene = new THREE.Scene()

  // const geometry = new THREE.BoxGeometry( 2, 2, 2 );
  // const material = new THREE.MeshNormalMaterial();
  // mesh = new THREE.Mesh( geometry, material );
  // scene.add( mesh );

  // line
  waveView = new WaveView()

  fft = new FFT()
  setInterval(() => ((fft.cutoff = Math.abs(Math.sin(Date.now() / 1000))), 50))
  setInterval(() => ((fft.zoom = Math.abs(Math.sin(Date.now() / 1314))), 50))

  fft.obj.scale.set(20, 1, 1)
  fft.obj.position.set(-10, -5, 0)

  env.scene.add(waveView.obj)
  env.scene.add(fft.obj)
  const canvas = document.querySelector('#c')

  // @ts-ignore
  env.renderer = new THREE.WebGLRenderer({ canvas, antialias: false })
  // @ts-ignore
  env.renderer.setSize(window.innerWidth, window.innerHeight)
  // @ts-ignore
  document.body.appendChild(env.renderer.domElement)
}

window.addEventListener('resize', onWindowResize, false)

function onWindowResize() {
  // @ts-ignore
  env.camera.aspect = window.innerWidth / window.innerHeight
  // @ts-ignore
  env.camera.updateProjectionMatrix()
  // @ts-ignore
  env.renderer.setSize(window.innerWidth, window.innerHeight)
}
function animate() {
  requestAnimationFrame(animate)

  // mesh.rotation.x += 0.01;
  // mesh.rotation.y += 0.02;

  // @ts-ignore
  env.renderer.render(env.scene, env.camera)
}

function audiotest() {
  navigator.mediaDevices
    .getUserMedia({ audio: true, video: false })
    .then(stream => {
      const FFTsampleRate = 10

      // @ts-ignore
      var audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      console.log(audioCtx.sampleRate / 2 + 'hz')

      var source = audioCtx.createMediaStreamSource(stream)
      var analyser = audioCtx.createAnalyser()
      source.connect(analyser)

      analyser.fftSize = POINTS * 2
      analyser.smoothingTimeConstant = FFTsampleRate / 100

      var bufferLength = analyser.frequencyBinCount
      var dataArray = new Uint8Array(bufferLength)

      function sample() {
        analyser.getByteTimeDomainData(dataArray)
        waveView.display(dataArray)

        analyser.getByteFrequencyData(dataArray)
        fft.display(dataArray)

        // var fdata = new Float32Array(analyser.fftSize)
        // analyser.getFloatTimeDomainData(fdata)
        // let [pitch, clarity] = pitchy.findPitch(fdata, audioCtx.sampleRate)

        // var max = _.reduce(
        //   dataArray.slice(0, 100),
        //   (maxData, val, index) =>
        //     // @ts-ignore
        //     maxData.val > val ? maxData : { val: val, index: index },
        //   {},
        // )
        // const freq = Math.floor(
        //   // @ts-ignore
        //   (audioCtx.sampleRate / 2 / analyser.frequencyBinCount) * max.index,
        // )

        // // @ts-ignore
        // if (max.val > 200) {
        //   // @ts-ignore
        //   freqDisplay.innerHTML =
        //     // @ts-ignore
        //     max.val +
        //     ' ' +
        //     freq +
        //     ' Hz ' +
        //     tone.Frequency(freq).toNote() +
        //     ' ' +
        //     tone.Frequency(pitch).toNote() +
        //     ' ' +
        //     clarity
        // } else {
        //   // @ts-ignore
        //   freqDisplay.innerHTML = ''
        // }
      }

      setInterval(sample, FFTsampleRate)
    })
}
// const freqDisplay = document.querySelector('#freq')
let fft: FFT
let waveView: WaveView

init()
animate()
audiotest()
