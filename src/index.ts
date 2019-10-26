import * as _ from 'lodash'
import * as THREE from 'three'
// @ts-ignore
import * as tone from 'tone'
// @ts-ignore
import * as pitchy from 'pitchy'

import { SignalLine } from './lines'
import { FFT } from './fft'

//import * as midi from 'web-midi-api'

const POINTS = 256

const env: {
  renderer?: THREE.WebGLRenderer
  camera?: THREE.PerspectiveCamera
  scene?: THREE.Scene
} = {}

class WaveView {
  public obj: THREE.Object3D
  private linewave: SignalLine
  constructor() {
    this.obj = new THREE.Object3D()

    this.linewave = new SignalLine(POINTS, {
      material: { color: 0xdddddd, linewidth: 2 },
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
  // setInterval(() => ((fft.cutoff = Math.abs(Math.sin(Date.now() / 1000))), 50))
  // setInterval(
  //   () => ((fft.zoom = 0.2 + Math.abs(Math.sin(Date.now() / 1314)) * 0.8), 50),
  // )

  fft.scaleX = 1
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

  // @ts-ignore
  navigator.requestMIDIAccess().then(m => {
    console.log('midi', m)
    // @ts-ignore
    const midiIn = m.inputs.values().next().value
    // @ts-ignore
    console.log('midiIn', (window.midiIn = midiIn))
    // @ts-ignore
    midiIn.onmidimessage = midiEvent => {
      // @ts-ignore
      const [eventType, channel, value] = midiEvent.data
      if (eventType != 176) {
        return
      }
      console.log('midi', channel, value)

      if (channel === 1) {
        fft.scaleX = 1 - value / 128
      }
      if (channel === 2) {
        fft.scaleY = value / 128
      }
      if (channel === 3) {
        fft.cutoff = 1 - value / 128
      }
    }
  })
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
      const FFTsampleRate = 20

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
        waveView.display(dataArray)

        analyser.getByteFrequencyData(dataArray)
        fft.display(dataArray)

        var fdata = new Float32Array(analyser.fftSize)
        analyser.getFloatTimeDomainData(fdata)
        let [pitch] = pitchy.findPitch(fdata, audioCtx.sampleRate)

        var max = _.reduce(
          dataArray.slice(0, 100),
          (maxData, val, index) =>
            // @ts-ignore
            maxData.val > val ? maxData : { val: val, index: index },
          {},
        )
        // const freq = Math.floor(
        //   // @ts-ignore
        //   (audioCtx.sampleRate / 2 / analyser.frequencyBinCount) * max.index,
        // )

        // @ts-ignore
        if (max.val > 200) {
          // @ts-ignore
          freqDisplay.innerHTML =
            // @ts-ignore
            tone.Frequency(pitch).toNote()
        } else {
          // @ts-ignore
          freqDisplay.innerHTML = ''
        }
      }

      setInterval(sample, FFTsampleRate)
    })
}
const freqDisplay = document.querySelector('#freq')
let fft: FFT
let waveView: WaveView

init()
animate()
audiotest()
