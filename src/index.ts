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

// var camera, scene, renderer
// var linefft, linewave, mesh

class Line {
  length: number
  pos: number
  stretch: number
  positions: Float32Array
  public line: THREE.Line

  constructor(length: number, pos: number = 0, stretch: number = 1) {
    this.length = length
    this.pos = pos
    this.stretch = stretch

    // geometry
    const geometry = new THREE.BufferGeometry()

    // attributes
    const positions = new Float32Array(length * 3)
    this.positions = positions

    _.times(length, (index: number) => {
      positions[index * 3] = (index - length / 2) / (length / 20)
      positions[index * 3 + 1] = pos
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
    this.line = new THREE.Line(geometry, material)
  }

  display(data: Uint8Array) {
    _.times(this.length, index => {
      this.positions[index * 3 + 1] =
        (data[index] / 128 || 0) * this.stretch + this.pos
    })
    // @ts-ignore
    this.line.geometry.attributes.position.needsUpdate = true
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
  linefft = new Line(POINTS, 3, 1)
  linewave = new Line(POINTS, -5, 2)
  env.scene.add(linewave.line)
  env.scene.add(linefft.line)

  const canvas = document.querySelector('#c')

  // @ts-ignore
  env.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
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
        linefft.display(dataArray)

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

let line = new Line(1, 2, 3)
console.log(line)

const freqDisplay = document.querySelector('#freq')
let linefft: Line
let linewave: Line

init()
animate()
audiotest()
