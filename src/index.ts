import * as _ from 'lodash'
import * as THREE from 'three'
// @ts-ignore
import * as tone from 'tone'
// @ts-ignore
import * as pitchy from 'pitchy'

const POINTS = 256

const env: {
  renderer?: THREE.WebGLRenderer
  camera?: THREE.PerspectiveCamera
  scene?: THREE.Scene
} = {}

class SignalLine {
  length: number
  stretch: number
  positions: Float32Array
  public obj: THREE.Line

  constructor(length: number, stretch: number = 1) {
    this.length = length
    this.stretch = stretch

    // geometry
    const geometry = new THREE.BufferGeometry()

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

    // material
    var material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      linewidth: 2,
    })
    this.obj = new THREE.Line(geometry, material)
  }

  display(data: Uint8Array) {
    _.times(this.length, index => {
      this.positions[index * 3 + 1] = (data[index] / 128 || 0) * this.stretch
    })
    // @ts-ignore
    this.obj.geometry.attributes.position.needsUpdate = true
  }
}

class LineX {
  positions: Float32Array
  public obj: THREE.Line

  constructor(positions: Array<number>, opts?: { color?: number }) {
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
      ...opts,
    })

    this.obj = new THREE.Line(geometry, material)
  }
}

class FFT {
  public obj: THREE.Object3D
  private centerLine: LineX
  private signalLine: SignalLine

  constructor() {
    const obj = (this.obj = new THREE.Object3D())
    this.centerLine = new LineX([0, 0, 0, 1, 0, 0], { color: 0xff0000 })
    this.signalLine = new SignalLine(POINTS, 3)

    obj.add(this.signalLine.obj)
    obj.add(this.centerLine.obj)
  }

  display(data: Uint8Array) {
    this.signalLine.display(data)
  }
}

function init() {
  env.camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    13,
  )
  env.camera.position.z = 10

  env.scene = new THREE.Scene()

  // const geometry = new THREE.BoxGeometry( 2, 2, 2 );
  // const material = new THREE.MeshNormalMaterial();
  // mesh = new THREE.Mesh( geometry, material );
  // scene.add( mesh );

  // line
  linewave = new SignalLine(POINTS, -3)
  linewave.obj.scale.set(20, 1, 1)
  linewave.obj.position.set(-10, 0, 0)

  fft = new FFT()

  fft.obj.scale.set(20, 1, 1)
  fft.obj.position.set(-10, 0, 0)

  env.scene.add(linewave.obj)
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
      // @ts-ignore
      var audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      console.log(audioCtx.sampleRate / 2 + 'hz')

      var source = audioCtx.createMediaStreamSource(stream)
      var analyser = audioCtx.createAnalyser()
      source.connect(analyser)

      analyser.fftSize = POINTS * 2
      analyser.smoothingTimeConstant = 0.7

      var bufferLength = analyser.frequencyBinCount
      var dataArray = new Uint8Array(bufferLength)

      function sample() {
        analyser.getByteTimeDomainData(dataArray)
        linewave.display(dataArray)

        analyser.getByteFrequencyData(dataArray)
        fft.display(dataArray)

        var fdata = new Float32Array(analyser.fftSize)
        analyser.getFloatTimeDomainData(fdata)
        let [pitch, clarity] = pitchy.findPitch(fdata, audioCtx.sampleRate)

        var max = _.reduce(
          dataArray.slice(0, 100),
          (maxData, val, index) =>
            // @ts-ignore
            maxData.val > val ? maxData : { val: val, index: index },
          {},
        )
        const freq = Math.floor(
          // @ts-ignore
          (audioCtx.sampleRate / 2 / analyser.frequencyBinCount) * max.index,
        )

        // @ts-ignore
        if (max.val > 200) {
          // @ts-ignore
          freqDisplay.innerHTML =
            // @ts-ignore
            max.val +
            ' ' +
            freq +
            ' Hz ' +
            tone.Frequency(freq).toNote() +
            ' ' +
            tone.Frequency(pitch).toNote() +
            ' ' +
            clarity
        } else {
          // @ts-ignore
          freqDisplay.innerHTML = ''
        }
      }

      setInterval(sample, 10)
    })
}

const freqDisplay = document.querySelector('#freq')
let fft: FFT
let linewave: SignalLine

init()
animate()
audiotest()
