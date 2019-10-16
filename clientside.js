const _ = require('lodash')
const THREE = require('three')
const tone = require('tone')
const pitchy = require('pitchy')


window.tone = tone
const POINTS = 256;

var camera, scene, renderer;
var linefft, linewave, mesh;

init();
animate();
audiotest();

const freqDisplay = document.querySelector('#freq');
window.freqDisplay = freqDisplay

function Line(length, pos = 0, stretch = 1) {
  this.stretch = stretch
  this.length = length
  this.pos = pos
  
  // geometry
  var geometry = new THREE.BufferGeometry();

  // attributes
  var positions = new Float32Array( length * 3 );
  this.positions = positions
  
  _.times(length, (index) => {
    positions[index * 3] = (index - (length / 2)) / (length / 20)
    positions[(index * 3) + 1] = pos
    positions[(index * 3) + 2] = 0
  })
  
  geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
  
  // draw range
  geometry.setDrawRange( 0, length - 1 );

  // material
  var material = new THREE.LineBasicMaterial( { color: 0xffffff, linewidth: 2 } );
  this.line = new THREE.Line( geometry,  material );
  return this
}

Line.prototype.display = function (data) {
  _.times(this.length, (index) => {
    this.positions[(index * 3) + 1] = ((data[index] / 128) || 0) * this.stretch + this.pos
  })

  this.line.geometry.attributes.position.needsUpdate = true;
}




function init() {
  camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 13 );
  camera.position.z = 10;
  
  scene = new THREE.Scene();
  
  // const geometry = new THREE.BoxGeometry( 2, 2, 2 );
  // const material = new THREE.MeshNormalMaterial();
  // mesh = new THREE.Mesh( geometry, material );
  // scene.add( mesh );

  // line
  linefft = new Line(POINTS, 3, 1)
  linewave = new Line(POINTS, -5, 2)
  scene.add(linewave.line);
  scene.add(linefft.line);
  
  
  const canvas = document.querySelector('#c');
  
  renderer = new THREE.WebGLRenderer( { canvas, antialias: true } );
  renderer.setSize( window.innerWidth, window.innerHeight );
  document.body.appendChild( renderer.domElement );
  
}


window.addEventListener( 'resize', onWindowResize, false );

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );

}
function animate() {
  
  requestAnimationFrame( animate );
  
  // mesh.rotation.x += 0.01;
  // mesh.rotation.y += 0.02;
  
  renderer.render( scene, camera );
  
}



function audiotest() {
  navigator.mediaDevices.getUserMedia ({audio: true, video: false}).then((stream) => {

    var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    console.log(audioCtx.sampleRate / 2 + "hz")
    
    var source = audioCtx.createMediaStreamSource(stream);
    var analyser = audioCtx.createAnalyser();
    source.connect(analyser);
    
    analyser.fftSize = POINTS * 2;
    analyser.smoothingTimeConstant = 0.7

    var bufferLength = analyser.frequencyBinCount;
    var dataArray = new Uint8Array(bufferLength);

    function sample() {
      
      analyser.getByteTimeDomainData(dataArray);
      linewave.display(dataArray)
      
      analyser.getByteFrequencyData(dataArray)      
      linefft.display(dataArray)

      var fdata = new Float32Array(analyser.fftSize)
      analyser.getFloatTimeDomainData(fdata);
      let [pitch, clarity] = pitchy.findPitch(fdata, audioCtx.sampleRate);
      
      var max = _.reduce(dataArray.slice(0, 100) , ((maxData, val, index) => maxData.val > val ? maxData : { val: val, index: index }), {})
      const freq = Math.floor(((audioCtx.sampleRate / 2) / analyser.frequencyBinCount) * max.index)

      if (max.val > 200) {
        freqDisplay.innerHTML = max.val + " " + freq + " Hz " + tone.Frequency(freq).toNote() + " " + Math.round(pitch) + " " + clarity
      } else  {
        freqDisplay.innerHTML = ""
      }
      
    }

    setInterval(sample, 10)
  })
}




