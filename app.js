import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---------------------------------------------------------------- datos

// Track 01: audio supplied by the creator; the file input can replace it during testing.
window.microTrack01Url = new URL('./assets/audio/track-01.m4a', import.meta.url).href;

const TRACKS = [
  { id: '01-melanocetus', n: '01', name: 'Melanocetus' },
  { id: '02-paucovertebratis', n: '02', name: 'paucovertebratis' },
  { id: '03-saccopharynx', n: '03', name: 'Saccopharynx' },
  { id: '04-eurypharynx', n: '04', name: 'Eurypharynx' },
  { id: '05-chauliodus', n: '05', name: 'Chauliodus' },
  { id: '06-caulophryne', n: '06', name: 'Caulophryne' },
];
const YOUTUBE = '';  // playlist con los visuales completos

const MOBILE = matchMedia('(pointer: coarse)').matches || innerWidth < 700;
const DRAW = MOBILE ? 30000 : 80000;           // puntos dibujados por pez
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

// textos de la página en inglés y portugués (el español vive en el HTML); el selector de idioma está en /obra-expandida.js
const t = (k, ...a) => window.fgObra ? window.fgObra.t(k, ...a) : k;
window.fgObra?.i18n({
  es: { makeYours: 'Haz tu propia criatura', loadFail: 'no se pudo cargar',
        webm: 'Este navegador graba en WebM: Instagram no lo acepta, conviértelo o graba desde Chrome/Safari reciente. ' },
  en: { soon: 'soon', back: 'Back', fxMirror: 'mirror', fxEdges: 'edges', yours: 'Your creature', keep: 'Keep playing',
        introT: 'An expanded audiovisual experience by Microcosmonauta',
        introLead: 'In the deep it is always night. Light comes from its creatures when they let themselves be seen.',
        introTouch: 'Touch a creature: its song plays and you enter its visual.',
        introDesk: 'Drag to look around and swim with the wheel or the arrow keys. Inside: move the cursor, press and hold, drag.',
        introPads: 'mirror · feedback · glitch · edges',
        introMobile: 'Drag to look around and pinch to swim. Inside: swipe, keep your finger still and turn on the effects.',
        introRec: 'Record what you make <span class="desk">with <kbd>R</kbd></span> and share it tagging Microcosmonauta',
        enter: 'Enter', loading: 'loading specimens', loadFail: 'could not load', makeYours: 'Make your own creature',
        webm: 'This browser records in WebM, which Instagram doesn’t accept: convert it or record from a recent Chrome or Safari. ' },
  de: { soon: 'demnächst', back: 'Zurück', fxMirror: 'Spiegel', fxEdges: 'Konturen', yours: 'Deine Kreatur', keep: 'Weiter erkunden',
        introT: 'Ein erweitertes audiovisuelles Erlebnis',
        introLead: 'In der Tiefe ist es immer Nacht. Licht kommt von den Kreaturen, wenn sie sich zeigen.',
        introTouch: 'Berühre eine Kreatur: Ihr Track beginnt und du tauchst in ihre Visualisierung ein.',
        introDesk: 'Ziehe zum Umschauen und bewege dich mit Mausrad oder Pfeiltasten. Im Inneren: Cursor bewegen, halten und ziehen.',
        introPads: 'Spiegel · Feedback · Glitch · Konturen',
        introMobile: 'Ziehe zum Umschauen und zoome mit zwei Fingern. Im Inneren: wische, halte den Finger ruhig und aktiviere Effekte.',
        introRec: 'Nimm deine Erkundung auf <span class="desk">mit <kbd>R</kbd></span> und teile sie.',
        enter: 'Eintreten', loading: 'Kreaturen werden geladen', loadFail: 'Laden fehlgeschlagen', makeYours: 'Gestalte deine Kreatur',
        webm: 'Dieser Browser zeichnet in WebM auf. ' },
});

if (YOUTUBE) document.getElementById('yt').href = YOUTUBE;
else document.getElementById('yt').classList.add('soon'), document.getElementById('yt').removeAttribute('href');

// ---------------------------------------------------------------- render

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, MOBILE ? 1.5 : 1.75));
renderer.setClearColor(0x000000, 1);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;  // los colores del .ply ya son de pantalla: sin conversión extra
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(MOBILE ? 52 : 38, 1, 0.05, 100);
camera.position.set(0, 0, 9);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.6, 0.5, 0.32);
composer.addPass(bloom);

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`;

// A · espejo caleidoscópico centrado en el cursor
const mirrorPass = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uMirror: { value: 0 }, uSeg: { value: 6 }, uSpin: { value: 0 },
              uCenter: { value: new THREE.Vector2(0.5, 0.5) }, uAspect: { value: 1 } },
  vertexShader: VERT,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uMirror, uSeg, uSpin, uAspect; uniform vec2 uCenter; varying vec2 vUv;
    void main(){
      vec3 o = texture2D(tDiffuse, vUv).rgb;
      if (uMirror < 0.002) { gl_FragColor = vec4(o, 1.0); return; }
      vec2 p = vUv - uCenter; p.x *= uAspect;
      float r = length(p), a = atan(p.y, p.x) + uSpin, seg = 6.2831853 / uSeg;
      a = mod(a, seg); a = abs(a - seg * 0.5);                  // cada segmento es el espejo del anterior
      vec2 q = vec2(cos(a), sin(a)) * r; q.x /= uAspect;
      vec3 k = texture2D(tDiffuse, fract(abs(q + uCenter))).rgb;
      gl_FragColor = vec4(mix(o, max(o * 0.25, k), uMirror), 1.0);  // a fondo: caleidoscopio puro
    }`,
});
composer.addPass(mirrorPass);

// S · feedback propio: el cuadro anterior regresa con zoom, giro y cambio de tono (el Afterimage no gira)
class FeedbackPass extends Pass {
  constructor() {
    super();
    const opt = { type: THREE.HalfFloatType };
    this.a = new THREE.WebGLRenderTarget(1, 1, opt);
    this.b = new THREE.WebGLRenderTarget(1, 1, opt);
    this.uniforms = { tNew: { value: null }, tOld: { value: null }, uKeep: { value: 0 }, uZoom: { value: 0 },
                      uRot: { value: 0 }, uHue: { value: 0 }, uCenter: { value: new THREE.Vector2(0.5, 0.5) }, uAspect: { value: 1 } };
    this.quad = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: VERT,
      fragmentShader: `
        uniform sampler2D tNew, tOld; uniform float uKeep, uZoom, uRot, uHue, uAspect; uniform vec2 uCenter; varying vec2 vUv;
        vec3 hue(vec3 c, float a){ const vec3 k = vec3(0.57735); float ca = cos(a); return c * ca + cross(k, c) * sin(a) + k * dot(k, c) * (1.0 - ca); }
        void main(){
          vec2 p = vUv - uCenter; p.x *= uAspect;
          float ca = cos(uRot), sa = sin(uRot);
          p = mat2(ca, -sa, sa, ca) * p * (1.0 - uZoom);
          p.x /= uAspect;
          vec2 uv2 = p + uCenter;
          float inside = step(0.0, uv2.x) * step(uv2.x, 1.0) * step(0.0, uv2.y) * step(uv2.y, 1.0);
          vec3 old = max(hue(texture2D(tOld, uv2).rgb, uHue), 0.0) * uKeep * inside;
          gl_FragColor = vec4(max(texture2D(tNew, vUv).rgb, old), 1.0);
        }`,
    }));
    this.copy = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: { t: { value: null } }, vertexShader: VERT,
      fragmentShader: `uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = texture2D(t, vUv); }`,
    }));
  }
  setSize(w, h) { this.a.setSize(w, h); this.b.setSize(w, h); this.uniforms.uAspect.value = w / h; }
  render(renderer, writeBuffer, readBuffer) {
    this.uniforms.tNew.value = readBuffer.texture;
    this.uniforms.tOld.value = this.a.texture;
    renderer.setRenderTarget(this.b);
    this.quad.render(renderer);
    [this.a, this.b] = [this.b, this.a];
    this.copy.material.uniforms.t.value = this.a.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.copy.render(renderer);
  }
}
const feedbackPass = new FeedbackPass();
composer.addPass(feedbackPass);

// D · glitch · F · bordes y trama de puntos · siempre: rebanadas de escáner, grano y viñeta (el grano es ADN de la marca)
const scanPass = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uGlitch: { value: 0 }, uBlocks: { value: 0 }, uEdge: { value: 0 }, uDotSize: { value: 7 },
              uTime: { value: 0 }, uGrain: { value: 0.045 }, uRes: { value: new THREE.Vector2(1, 1) } },
  vertexShader: VERT,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uGlitch, uBlocks, uEdge, uDotSize, uTime, uGrain; uniform vec2 uRes; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
    void main(){
      vec2 uv = vUv;
      float tick = floor(uTime * 24.0);
      // rebanadas de escáner
      float band = floor(uv.y * 54.0);
      float on = step(1.0 - uGlitch * 0.4, h(vec2(band, tick)));
      uv.x += on * (h(vec2(band * 1.7, tick)) - 0.5) * 0.14 * uGlitch;
      // bloques desplazados (D)
      vec2 blk = floor(uv * vec2(18.0, 11.0));
      float bon = step(1.0 - uBlocks * 0.35, h(blk + tick * 0.37));
      uv += bon * (vec2(h(blk + 3.1), h(blk + 7.7)) - 0.5) * 0.18 * uBlocks;
      float split = (0.003 * uGlitch + 0.012 * uBlocks) * (0.5 + h(vec2(tick, 1.0)));
      vec3 c = vec3(texture2D(tDiffuse, uv + vec2(split, 0.0)).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - vec2(split, 0.0)).b);
      // bordes + trama de puntos (F)
      if (uEdge > 0.002) {
        vec2 px = 1.0 / uRes;
        float gx = lum(texture2D(tDiffuse, uv + vec2(px.x, 0.0)).rgb) - lum(texture2D(tDiffuse, uv - vec2(px.x, 0.0)).rgb);
        float gy = lum(texture2D(tDiffuse, uv + vec2(0.0, px.y)).rgb) - lum(texture2D(tDiffuse, uv - vec2(0.0, px.y)).rgb);
        vec3 edge = vec3(0.6, 0.9, 1.0) * smoothstep(0.02, 0.2, length(vec2(gx, gy)));
        vec2 cell = uDotSize / uRes;
        vec2 cc = (floor(uv / cell) + 0.5) * cell;
        vec3 cellCol = texture2D(tDiffuse, cc).rgb;
        float dotMask = step(length((uv - cc) / cell), 0.65 * sqrt(lum(cellCol)));
        vec3 f = max(edge, cellCol * dotMask * 1.4);
        c = mix(c, f, uEdge);
      }
      c *= 0.95 + 0.05 * sin(vUv.y * 1100.0);
      c += (h(vUv * vec2(1733.0, 947.0) + fract(uTime)) - 0.5) * uGrain;
      float d = distance(vUv, vec2(0.5));
      c *= mix(1.0, 0.55, smoothstep(0.3, 0.85, d));
      gl_FragColor = vec4(c, 1.0);
    }`,
});
composer.addPass(scanPass);
composer.addPass(new OutputPass());
if (location.search.includes('debug')) window.__dbg = { THREE, renderer, composer, scene, camera, bloom, scanPass, mirrorPass, feedbackPass };

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  bloom.setSize(w, h);
  mirrorPass.uniforms.uAspect.value = w / h;
  scanPass.uniforms.uRes.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------- peces (point clouds)

const fishVert = `
  attribute vec3 aPos2; attribute vec3 aCol2;
  uniform float uMorph, uTime, uKick, uWave, uSwim, uTurn, uGlitch, uSize, uPix, uSleep, uScan, uScanAmt, uVis, uLens, uAspect;
  uniform vec2 uMouse;
  varying vec3 vCol;
  float hash(float n){ return fract(sin(n) * 43758.5453); }
  void main(){
    vec3 p = mix(position, aPos2, uMorph);
    vec3 c = mix(color, aCol2, uMorph);
    // barrido de escáner: dentro de la banda se ve el esqueleto, encendido
    float sb = (1.0 - smoothstep(0.0, 0.09, abs(position.x - uScan))) * uScanAmt;
    p = mix(p, aPos2, sb);
    c = mix(c, aCol2 * 2.2 + vec3(0.05, 0.12, 0.16), sb);
    // nado: onda lateral que nace en la cabeza (+x) y crece hacia la cola
    float tail = smoothstep(0.8, -1.0, p.x);
    p.z += sin(p.x * 3.2 - uTime * uSwim) * uWave * tail + uTurn * p.x * p.x * 0.35;
    // glitch de escáner: rebanadas horizontales que se desplazan
    float tick = floor(uTime * 22.0);
    float slice = floor((p.y + 1.0) * 16.0);
    float g = step(1.0 - uGlitch * 0.5, hash(slice * 1.31 + tick));
    p.x += g * (hash(slice * 7.7 + tick) - 0.5) * 0.5 * uGlitch;
    // linterna de rayos X: donde está el cursor (en pantalla) se ve el esqueleto, encendido
    vec4 clip0 = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    vec2 ndc = clip0.xy / clip0.w;
    float lens = (1.0 - smoothstep(0.12, 0.3, length((ndc - uMouse) * vec2(uAspect, 1.0)))) * uLens;
    p = mix(p, aPos2, lens);
    c = mix(c, aCol2 * 1.8 + vec3(0.04, 0.1, 0.14), lens);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = max(1.0, uSize * uPix / -mv.z);
    float lum = max(c.r, max(c.g, c.b));
    float lit = smoothstep(0.32, 0.75, lum);            // fotóforos y puntas encendidas
    vec3 col = c * (1.0 + lit * uKick * 2.2);
    col *= mix(1.0, 0.1 + lit * 1.1, uSleep);            // dormido en el frasco: casi apagado
    col *= exp(-max(0.0, -mv.z - 10.0) * 0.08);   // lo lejano se pierde en el agua
    vCol = col * uVis;
  }`;
const fishFrag = `
  varying vec3 vCol;
  void main(){
    vec2 d = gl_PointCoord - 0.5;
    if (dot(d, d) > 0.25) discard;
    gl_FragColor = vec4(vCol, 1.0);
  }`;

async function loadFish(id) {
  const buf = await (await fetch(`./assets/creatures/${id}.bin`)).arrayBuffer();
  const n = new Uint32Array(buf, 0, 1)[0];
  let o = 4;
  const pb = new Int16Array(buf, o, n * 3); o += n * 6;
  const ps = new Int16Array(buf, o, n * 3); o += n * 6;
  const cb = new Uint8Array(buf, o, n * 3); o += n * 3;
  const cs = new Uint8Array(buf, o, n * 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pb, 3, true));
  g.setAttribute('aPos2', new THREE.BufferAttribute(ps, 3, true));
  g.setAttribute('color', new THREE.BufferAttribute(cb, 3, true));
  g.setAttribute('aCol2', new THREE.BufferAttribute(cs, 3, true));
  g.setDrawRange(0, Math.min(DRAW, n));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1.8);
  const m = new THREE.ShaderMaterial({
    vertexShader: fishVert, fragmentShader: fishFrag, vertexColors: true,
    uniforms: {
      uMorph: { value: 0 }, uTime: { value: 0 }, uKick: { value: 0 }, uWave: { value: 0.03 }, uSwim: { value: 1.2 },
      uTurn: { value: 0 }, uGlitch: { value: 0 }, uSize: { value: MOBILE ? 0.02 : 0.013 }, uPix: { value: 1 },
      uSleep: { value: 1 }, uScan: { value: -9 }, uScanAmt: { value: 0 }, uVis: { value: 1 },
      uLens: { value: 0 }, uAspect: { value: 1 }, uMouse: { value: new THREE.Vector2(9, 9) },
    },
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  return pts;
}

// nieve marina: partículas que caen despacio en el abismo
function makeSnow(n = MOBILE ? 900 : 2200) {
  const pos = new Float32Array(n * 3), seed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 22; pos[i * 3 + 1] = (Math.random() - 0.5) * 14; pos[i * 3 + 2] = (Math.random() - 0.5) * 16;
    seed[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uHat: { value: 0 }, uPix: { value: 1 }, uVis: { value: 0.35 }, uCam: { value: new THREE.Vector3() } },
    vertexShader: `
      attribute float aSeed; uniform float uTime, uHat, uPix; uniform vec3 uCam; varying float vB;
      void main(){
        vec3 p = position;
        p.y -= uTime * (0.05 + aSeed * 0.08);
        vec3 box = vec3(22.0, 14.0, 16.0);
        p = mod(p - uCam + box * 0.5, box) - box * 0.5 + uCam;
        p.x += sin(uTime * 0.3 + aSeed * 20.0) * 0.2;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = max(1.0, (0.012 + aSeed * 0.025) * uPix / -mv.z);
        vB = 0.25 + step(0.82, fract(aSeed * 91.0 + floor(uTime * 8.0) * 0.37)) * uHat * 1.5;
      }`,
    fragmentShader: `
      uniform float uVis; varying float vB;
      void main(){ vec2 d = gl_PointCoord - 0.5; if (dot(d,d) > 0.25) discard; gl_FragColor = vec4(vec3(0.6, 0.75, 0.8) * vB * uVis, 1.0); }`,
  });
  const p = new THREE.Points(g, m);
  p.frustumCulled = false;
  return p;
}

// ---------------------------------------------------------------- audio

const audio = new Audio();
audio.crossOrigin = 'anonymous';
audio.preload = 'auto';
let actx, analyser, freq, recAudio;
const bands = {
  kick: { lo: 35, hi: 120 }, snare: { lo: 1800, hi: 5000 }, hat: { lo: 7000, hi: 14000 }, bass: { lo: 35, hi: 220 },
};
for (const b of Object.values(bands)) Object.assign(b, { mean: 0, var: 1e-4, pulse: 0, level: 0 });
let energyLong = 0, energyBase = 0;
if (window.__dbg) Object.assign(window.__dbg, { audio, bands });

function initAudio() {
  if (actx) return;
  actx = new (window.AudioContext || window.webkitAudioContext)();
  const src = actx.createMediaElementSource(audio);
  analyser = actx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.55;
  src.connect(analyser);
  analyser.connect(actx.destination);
  recAudio = actx.createMediaStreamDestination();   // el mismo audio, hacia la grabación
  analyser.connect(recAudio);
  freq = new Uint8Array(analyser.frequencyBinCount);
}

function readAudio(dt) {
  if (!analyser || audio.paused) {
    for (const b of Object.values(bands)) { b.pulse *= 0.9; b.level *= 0.95; }
    return;
  }
  analyser.getByteFrequencyData(freq);
  const hz = actx.sampleRate / analyser.fftSize;
  let total = 0;
  for (const b of Object.values(bands)) {
    const i0 = Math.max(1, Math.floor(b.lo / hz)), i1 = Math.ceil(b.hi / hz);
    let e = 0;
    for (let i = i0; i <= i1; i++) e += freq[i];
    e /= (i1 - i0 + 1) * 255;
    // detección de golpes: cuánto sobresale del promedio reciente (en desviaciones estándar)
    const z = (e - b.mean) / Math.sqrt(b.var + 1e-5);
    b.mean += (e - b.mean) * 0.04;
    b.var += ((e - b.mean) ** 2 - b.var) * 0.04;
    b.pulse = Math.max(b.pulse * Math.pow(0.02, dt * 2.5), z > 1.6 ? Math.min(1, (z - 1.2) / 2) : 0);
    b.level += (e - b.level) * 0.1;
    total += e;
  }
  if (energyBase === 0) energyLong = energyBase = total;   // arranca con la primera lectura, no desde 0
  energyLong += (total - energyLong) * dt * 0.6;
  energyBase += (total - energyBase) * dt * 0.05;
}

// ---------------------------------------------------------------- nado (el piloto, en JS)

class Swimmer {
  constructor(R, speed = 0.35, seed = 0) {
    this.R = R; this.speed = speed; this.seed = seed;
    this.pos = new THREE.Vector3(); this.yaw = Math.random() * Math.PI * 2; this.pitch = 0; this.turn = 0; this.burst = 0; this.t = seed * 37;
  }
  noise(t, s) { return (Math.sin(t * 0.44 + s) + 0.5 * Math.sin(t * 1.02 + s * 2.3) + 0.25 * Math.sin(t * 2.13 + s * 4.1)) / 1.75; }
  step(dt, speedMul = 1) {
    this.t += dt;
    const R = this.R;
    let want = 0.55 * this.noise(this.t, 1.3 + this.seed);
    const edge = Math.hypot(this.pos.x / R.x, this.pos.y / R.y, this.pos.z / R.z);
    if (edge > 0.6) {
      const home = Math.atan2(this.pos.z, -this.pos.x);
      const diff = ((home - this.yaw + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
      want += diff * (edge - 0.6) * 3;
    }
    want = THREE.MathUtils.clamp(want, -0.7, 0.7);
    this.turn += (want - this.turn) * Math.min(1, dt * 2);
    this.yaw += this.turn * dt;
    const wp = 0.35 * this.noise(this.t * 0.7, 4.2 + this.seed) - 0.8 * this.pos.y / R.y * 0.35;
    this.pitch += (wp - this.pitch) * Math.min(1, dt * 1.5);
    if (Math.random() < 0.04 * dt) this.burst = 1;
    this.burst *= Math.exp(-dt * 1.8);
    const sp = this.speed * (1 + 0.5 * this.noise(this.t * 0.5, 7.7 + this.seed)) * (1 + 2.5 * this.burst) * speedMul;
    this.pos.x += Math.cos(this.yaw) * Math.cos(this.pitch) * sp * dt;
    this.pos.z += -Math.sin(this.yaw) * Math.cos(this.pitch) * sp * dt;
    this.pos.y += Math.sin(this.pitch) * sp * dt;
  }
}

// ---------------------------------------------------------------- escena

const world = new THREE.Group();
scene.add(world);
const snow = makeSnow();
scene.add(snow);

const specimens = [];   // { track, fish, swim, tag }
const HOME = MOBILE ? { x: 6, y: 6, z: 8 } : { x: 13, y: 4.5, z: 13 };   // el abismo donde nadan, navegable
const HOME_Z = MOBILE ? 13 : 12;
// cámara libre del inicio: se mira arrastrando y se nada con la rueda / pellizco / flechas
const nav = { pos: new THREE.Vector3(0, 0, HOME_Z), vel: new THREE.Vector3(), yaw: 0, pitch: 0, yawT: 0, pitchT: 0, keys: new Set(), idle: 0 };
const NAV_BOUND = MOBILE ? 17 : 21;
const SEP = MOBILE ? 4 : 6.5;   // distancia mínima entre criaturas: cada una tiene su zona
const MAGNET_R = 4.5;           // a esta distancia el imán deja de jalar: la criatura ya se ve bien
const navForward = (v = new THREE.Vector3()) => v.set(-Math.sin(nav.yaw) * Math.cos(nav.pitch), Math.sin(nav.pitch), -Math.cos(nav.yaw) * Math.cos(nav.pitch));
const SCHOOL_SCALE = MOBILE ? 0.62 : 0.55, ACTIVE_SCALE = MOBILE ? 1.05 : 1.25;
let state = 'inicio';  // inicio → entrando → abismo → regresando
let current = -1, stateT = 0, hovered = -1;
const tagsEl = document.getElementById('tags');

async function build() {
  for (const [k, t] of TRACKS.entries()) {
    const fish = await loadFish(t.id);
    fish.scale.setScalar(SCHOOL_SCALE);
    world.add(fish);
    const swim = new Swimmer(HOME, 0.3, k + 1);
    // arrancan repartidos frente a la cámara, para que al llegar se vea el cardumen; luego se dispersan solos
    const a = (k / (TRACKS.length - 1)) * 2 - 1;
    swim.pos.set(a * (MOBILE ? 2.4 : 6.5) + (Math.random() - 0.5), (Math.random() * 2 - 1) * (MOBILE ? 3 : 1.8), MOBILE ? (Math.random() * 2 - 1) * 3.5 : -1.5 - Math.random() * 5 + (k % 2) * 3);
    fish.position.copy(swim.pos);
    const tag = document.createElement('div');
    tag.className = 'tag';
    tag.innerHTML = `<b>${t.n}<span class="nm"> · ${t.name}</span></b>`;
    if (TOUCH) tag.classList.add('compact');   // en touch: sólo el número, para que no se encimen
    tagsEl.appendChild(tag);
    specimens.push({ track: t, fish, swim, tag });
  }
  if (window.__dbg) window.__dbg.specimens = specimens;
  camera.position.set(0, 0, HOME_Z);
  document.getElementById('loading').classList.add('done');
  showIntro();
}

// ---------------------------------------------------------------- interacción

const tmp2 = new THREE.Vector3();
function pick(e) {
  let best = null, bd = Infinity;
  const fov = THREE.MathUtils.degToRad(camera.fov);
  specimens.forEach((s, i) => {
    tmp2.copy(s.fish.position).project(camera);
    if (tmp2.z > 1) return;
    const sx = (tmp2.x * 0.5 + 0.5) * innerWidth, sy = (-tmp2.y * 0.5 + 0.5) * innerHeight;
    const dist = camera.position.distanceTo(s.fish.position);
    const r = Math.max(MOBILE ? 48 : 38, s.fish.scale.x * innerHeight / (2 * Math.tan(fov / 2) * dist) * 1.15);
    const d = Math.hypot(sx - e.clientX, sy - e.clientY);
    if (d < r && d < bd) { bd = d; best = i; }
  });
  return best === null ? null : { i: best };
}

// el visual como instrumento: cursor = linterna de rayos X y centro de los efectos; mantener = rayos X;
// arrastrar = girar alrededor del pez; rueda/pellizco = acercarse; A S D F (o botones) = efectos que se combinan
const FX_KEYS = { a: 'mirror', s: 'feedback', d: 'glitch', f: 'edges' };
const fx = { mirror: { v: 0, t: 0 }, feedback: { v: 0, t: 0 }, glitch: { v: 0, t: 0 }, edges: { v: 0, t: 0 } };
const ptr = { ndc: new THREE.Vector2(0, 0), uv: new THREE.Vector2(0.5, 0.5), down: false, moved: 0, downT: 0, inside: false,
              lastX: 0, lastY: 0, speed: 0 };
const orbit = { yaw: 0, pitch: 0.08, dist: MOBILE ? 5.6 : 4.6, distT: MOBILE ? 5.6 : 4.6 };
const touches = new Map();
let pinch0 = 0, xray = false;

function setFx(name, on) {
  fx[name].t = on ? 1 : 0;
  document.querySelector(`.pad[data-fx="${name}"]`)?.classList.toggle('on', on);
  if (on) hideIntro();
}
addEventListener('keydown', e => {
  const k = FX_KEYS[e.key.toLowerCase()];
  if (k && !e.repeat && !e.metaKey && !e.ctrlKey) setFx(k, true);
  if (e.key === ' ' && state === 'abismo') { e.preventDefault(); document.getElementById('bPlay').click(); }
});
addEventListener('keyup', e => { const k = FX_KEYS[e.key.toLowerCase()]; if (k) setFx(k, false); nav.keys.delete(e.key); });
addEventListener('keydown', e => {
  if (e.key.startsWith('Arrow') && state === 'inicio') { e.preventDefault(); nav.keys.add(e.key); nav.idle = 0; hideIntro(); }
});
addEventListener('blur', () => Object.keys(fx).forEach(k => setFx(k, false)));
// botones: en touch son interruptores (tocar = prender/apagar, se combinan); con mouse se mantienen como las teclas
const TOUCH = matchMedia('(pointer: coarse)').matches;
document.querySelectorAll('.pad').forEach(b => {
  b.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (TOUCH) return setFx(b.dataset.fx, !fx[b.dataset.fx].t);
    b.setPointerCapture(e.pointerId);
    setFx(b.dataset.fx, true);
  });
  b.addEventListener('pointerup', () => { if (!TOUCH) setFx(b.dataset.fx, false); });
  b.addEventListener('pointercancel', () => { if (!TOUCH) setFx(b.dataset.fx, false); });
});

function track(e) {
  ptr.ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ptr.uv.set(e.clientX / innerWidth, 1 - e.clientY / innerHeight);
  ptr.inside = true;
}
canvas.addEventListener('pointermove', e => {
  touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (touches.size === 2) {  // pellizco
    const [p1, p2] = [...touches.values()];
    const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
    if (pinch0 && state === 'inicio') { nav.vel.addScaledVector(navForward(), (d - pinch0) * 0.15); nav.idle = 0; }
    else if (pinch0) orbit.distT = THREE.MathUtils.clamp(orbit.distT * pinch0 / d, 1.6, 9);
    pinch0 = d;
    return;
  }
  track(e);
  if (ptr.down) {
    const dx = e.clientX - ptr.lastX, dy = e.clientY - ptr.lastY;
    ptr.moved += Math.abs(dx) + Math.abs(dy);
    ptr.speed = Math.min(1, ptr.speed + Math.hypot(dx, dy) / 80);
    if (state === 'abismo' && ptr.moved > 8) {
      orbit.yaw -= dx * 0.008;
      orbit.pitch = THREE.MathUtils.clamp(orbit.pitch + dy * 0.006, -1.1, 1.1);
    }
    if (state === 'inicio' && ptr.moved > 6) {
      nav.yawT += dx * 0.004;
      nav.pitchT = THREE.MathUtils.clamp(nav.pitchT + dy * 0.003, -1.1, 1.1);
      nav.idle = 0;
    }
  }
  ptr.lastX = e.clientX; ptr.lastY = e.clientY;
  if (state === 'inicio') {
    const h = pick(e);
    hovered = h ? h.i : -1;
    canvas.style.cursor = h ? 'pointer' : 'default';
  } else canvas.style.cursor = 'crosshair';
});
canvas.addEventListener('pointerdown', e => {
  touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (touches.size === 2) { pinch0 = 0; ptr.down = false; return; }
  track(e);
  ptr.down = true; ptr.moved = 0; ptr.downT = performance.now(); ptr.lastX = e.clientX; ptr.lastY = e.clientY;
  if (introOn) { hideIntro(); ptr.consumed = true; return; }
  ptr.consumed = false;
});
const release = e => {
  if (e.type === 'pointerup' && ptr.down && !ptr.consumed && ptr.moved < 8 && state === 'inicio' && touches.size < 2) {
    const h = pick(e);
    if (h) enterFish(h.i);
  }
  touches.delete(e.pointerId);
  if (touches.size < 2) pinch0 = 0;
  ptr.down = false;
  if (e.pointerType !== 'mouse') ptr.inside = false;  // en touch, la linterna se apaga al soltar
};
addEventListener('pointerup', release);
addEventListener('pointercancel', release);
canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') ptr.inside = false; });
canvas.addEventListener('wheel', e => {
  if (state === 'inicio') {
    e.preventDefault();
    nav.vel.addScaledVector(navForward(), -e.deltaY * 0.015);
    nav.idle = 0;
    hideIntro();
    return;
  }
  if (state !== 'abismo') return;
  e.preventDefault();
  orbit.distT = THREE.MathUtils.clamp(orbit.distT * Math.exp(e.deltaY * 0.0012), 1.6, 9);
  hideIntro();
}, { passive: false });

// ---------------------------------------------------------------- grabar y compartir
// Se graba un lienzo 9:16 (formato de Instagram/TikTok): cada cuadro del visual recortado al centro + marca de agua.
const SITE = 'Microcosmonauta';
document.fonts?.load("72px 'Jacquard 12'");   // la marca de agua la necesita cargada antes de grabar
const REC_MAX = 60;
const recCv = document.createElement('canvas');
recCv.width = MOBILE ? 720 : 1080; recCv.height = MOBILE ? 1280 : 1920;
const recCtx = recCv.getContext('2d');
let recorder = null, recChunks = [], recStart = 0, recFile = null;

function pickMime() {
  const opts = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
  return opts.find(m => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
}
function drawRecFrame() {
  const W = recCv.width, H = recCv.height, src = renderer.domElement;
  const sh = src.height, sw = Math.min(src.width, sh * 9 / 16);
  recCtx.drawImage(src, (src.width - sw) / 2, 0, sw, sh, 0, 0, W, H);
  // marca de agua: el visual viaja con su crédito
  const u = W / 1080;
  recCtx.fillStyle = 'rgba(232,236,239,0.9)';
  recCtx.font = `200 ${30 * u}px Manrope`;
  recCtx.fillText('Microcosmonauta', 54 * u, H - 120 * u);
  recCtx.font = `${72 * u}px 'Jacquard 12', Manrope`;
  recCtx.fillText('Criaturas Abisales', 54 * u, H - 64 * u);
  recCtx.fillStyle = 'rgba(232,236,239,0.55)';
  recCtx.font = `700 ${18 * u}px Manrope`;
  const tr = specimens[current]?.track;
  recCtx.fillText(`${tr ? tr.n + ' · ' + tr.name.toUpperCase() + '   ' : ''}${SITE.toUpperCase()}`, 54 * u, H - 30 * u);
}
function caption() {
  const tr = specimens[current]?.track;
  return t('caption', tr ? tr.name : 'Criaturas Abisales', 'Criaturas Abisales', SITE, t('makeYours')) +
         '\n#Microcosmonauta #audiovisual';
}
function startRec() {
  if (recorder || state !== 'abismo') return;
  const mime = pickMime();
  if (!mime) { alert(t('noRec')); return; }
  const stream = recCv.captureStream(30);
  if (recAudio) recAudio.stream.getAudioTracks().forEach(t => stream.addTrack(t));
  recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: MOBILE ? 5e6 : 8e6 });
  recChunks = [];
  recorder.ondataavailable = e => e.data.size && recChunks.push(e.data);
  recorder.onstop = finishRec;
  recorder.start(250);
  recStart = performance.now();
  document.body.classList.add('recording');
  document.getElementById('bRec').setAttribute('aria-label', 'Detener grabación');
  hideIntro();
}
function stopRec() { if (recorder && recorder.state !== 'inactive') recorder.stop(); }
function finishRec() {
  const type = recorder.mimeType.split(';')[0];
  const ext = type.includes('mp4') ? 'mp4' : 'webm';
  const tr = specimens[current]?.track;
  recFile = new File(recChunks, `criaturas-abisales-${tr ? tr.id : 'visual'}.${ext}`, { type });
  recorder = null;
  document.body.classList.remove('recording');
  document.getElementById('bRec').setAttribute('aria-label', 'Grabar');
  const url = URL.createObjectURL(recFile);
  const v = document.getElementById('shareVideo');
  v.src = url;
  document.getElementById('bDown').href = url;
  document.getElementById('bDown').download = recFile.name;
  document.getElementById('shareCap').textContent = caption();
  document.getElementById('shareNote').textContent =
    (ext === 'webm' ? t('webm') : '') + t('shareNote');
  document.getElementById('share').classList.add('on');
  document.getElementById('share').setAttribute('aria-hidden', 'false');
}
async function copyCaption() { try { await navigator.clipboard.writeText(caption()); return true; } catch { return false; } }
document.getElementById('bRec').onclick = () => (recorder ? stopRec() : startRec());
addEventListener('keydown', e => { if (e.key.toLowerCase() === 'r' && !e.repeat && !e.metaKey && !e.ctrlKey && state === 'abismo') recorder ? stopRec() : startRec(); });
document.getElementById('bShare').onclick = async () => {
  const note = await window.fgObra?.compartir(recFile, caption(), 'Criaturas Abisales');
  if (note) document.getElementById('shareNote').textContent = note;
};
document.getElementById('bCopy').onclick = async e => { if (await copyCaption()) e.currentTarget.textContent = t('copied'); };
window.fgObra?.onLang(() => { if (recFile) document.getElementById('shareCap').textContent = caption(); });
document.getElementById('bClose').onclick = () => {
  document.getElementById('share').classList.remove('on');
  document.getElementById('share').setAttribute('aria-hidden', 'true');
  document.getElementById('bCopy').textContent = t('copy');
};

// aviso de llegada: la primera vez, antes de entrar al abismo (las criaturas esperan atenuadas detrás)
let introOn = false;
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } },
                set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
function showIntro(force = false) {
  if (!force && store.get('ca-aviso') === '1') return;
  introOn = true;
  document.getElementById('intro').classList.add('on');
}
function hideIntro() {
  if (!introOn) return;
  introOn = false;
  store.set('ca-aviso', '1');
  document.getElementById('intro').classList.remove('on');
}
document.getElementById('intro').addEventListener('pointerdown', e => { e.stopPropagation(); hideIntro(); });
document.getElementById('bHelp').onclick = () => showIntro(true);

// entrar a una criatura: la cámara se sumerge hacia ella desde donde está, las demás se apagan
function diveTo(i) {
  const f = specimens[i].fish.position;
  orbit.dist = camera.position.distanceTo(f);
  orbit.distT = MOBILE ? 5.6 : 4.6;
  orbit.yaw = Math.atan2(camera.position.x - f.x, camera.position.z - f.z);
  orbit.pitch = 0.08;
  current = i;
  state = 'entrando';
  stateT = 0;
}
function enterFish(i) {
  initAudio();
  actx.resume();
  diveTo(i);
  playTrack(i);
}

function playTrack(i) {
  energyBase = 0;
  const t = specimens[i].track;
  if (i === 0 && window.microTrack01Url) { audio.src = window.microTrack01Url; audio.play().catch(() => setPlayIcon(false)); }
  else if (i === 0) { audio.pause(); audio.removeAttribute('src'); audio.load(); document.getElementById('pName').textContent = t.name + ' · add your audio'; }
  else { audio.pause(); audio.removeAttribute('src'); audio.load(); }
  document.getElementById('pNum').textContent = t.n;
  document.getElementById('pName').textContent = t.name;
  setPlayIcon(true);
}

function backHome() {
  if (state !== 'abismo') return;
  stopRec();
  state = 'regresando';
  stateT = 0;
  audio.pause();
  document.body.classList.remove('abyss');
  document.getElementById('player').classList.remove('on');
}

const setPlayIcon = playing => {
  document.getElementById('iPause').style.display = playing ? '' : 'none';  // hidden no aplica a <svg>
  document.getElementById('iPlay').style.display = playing ? 'none' : '';
};
document.getElementById('bPlay').onclick = () => { if (audio.paused) { audio.play(); setPlayIcon(true); } else { audio.pause(); setPlayIcon(false); } };
document.getElementById('bBack').onclick = backHome;
document.getElementById('bNext').onclick = () => nextTrack(1);
document.getElementById('bPrev').onclick = () => nextTrack(-1);
document.getElementById('bar').onclick = e => {
  const r = e.currentTarget.getBoundingClientRect();
  if (audio.duration) audio.currentTime = (e.clientX - r.left) / r.width * audio.duration;
};
audio.addEventListener('ended', () => nextTrack(1));

function nextTrack(d) {
  diveTo((current + d + specimens.length) % specimens.length);
  playTrack(current);
}

// ---------------------------------------------------------------- loop

const clock = new THREE.Clock();
const camTarget = new THREE.Vector3(), camPos = new THREE.Vector3(), tmp = new THREE.Vector3();
let glitch = 0, morph = 0, scan = -9, scanAmt = 0;

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  stateT += dt;
  readAudio(dt);
  const kick = bands.kick.pulse, snare = bands.snare.pulse, hat = bands.hat.pulse, bass = bands.bass.level;
  const pix = renderer.getPixelRatio() * innerHeight * 0.5;

  // efectos del instrumento: suben/bajan suave; el audio los modula mientras están activos
  for (const k in fx) fx[k].v += (fx[k].t - fx[k].v) * Math.min(1, dt * (fx[k].t ? 10 : 4));
  ptr.speed *= Math.pow(0.05, dt);
  const center = ptr.inside ? ptr.uv : new THREE.Vector2(0.5, 0.5);
  mirrorPass.uniforms.uCenter.value.lerp(center, Math.min(1, dt * 8));
  feedbackPass.uniforms.uCenter.value.copy(mirrorPass.uniforms.uCenter.value);
  mirrorPass.uniforms.uMirror.value = fx.mirror.v;
  if (kick > 0.6 && fx.mirror.v > 0.5 && !tick.kicked) { mirrorPass.uniforms.uSeg.value = [4, 6, 8, 3][(Math.random() * 4) | 0]; tick.kicked = true; }
  if (kick < 0.2) tick.kicked = false;
  mirrorPass.uniforms.uSpin.value += dt * (0.08 + snare * 0.8 + ptr.speed * 2) * (0.3 + fx.mirror.v);
  const abyssKeep = state === 'abismo' ? (REDUCED ? 0.45 : 0.62) : 0;
  const fu = feedbackPass.uniforms;
  fu.uKeep.value += (Math.max(abyssKeep, fx.feedback.v * 0.95) - fu.uKeep.value) * Math.min(1, dt * 3);
  fu.uZoom.value = fx.feedback.v * (0.006 + bass * 0.03) + ptr.speed * 0.01;
  fu.uRot.value = fx.feedback.v * (0.004 + snare * 0.03) + (ptr.down ? ptr.speed * 0.03 : 0);
  fu.uHue.value = fx.feedback.v * (0.015 + kick * 0.06);
  scanPass.uniforms.uBlocks.value = fx.glitch.v * (0.55 + snare * 0.45 + kick * 0.3);
  scanPass.uniforms.uEdge.value = fx.edges.v;
  scanPass.uniforms.uDotSize.value = (MOBILE ? 6 : 7) + kick * 6;

  // glitch: golpes de snare + un pico al entrar a una criatura
  const breakFlash = state === 'entrando' ? Math.max(0, 0.45 - stateT * 0.6) : 0;
  glitch = Math.max(glitch * Math.pow(0.03, dt * 3), snare * 0.9, breakFlash);
  if (REDUCED) glitch *= 0.3;
  scanPass.uniforms.uGlitch.value = glitch;
  scanPass.uniforms.uTime.value = t;

  // rayos X: partes con mucha energía, o mientras se mantiene presionado
  const hot = energyBase > 0 ? THREE.MathUtils.clamp((energyLong / energyBase - 1.12) * 5, 0, 1) : 0;
  xray = ptr.down && ptr.moved < 10 && performance.now() - ptr.downT > 220 && state === 'abismo';
  morph += ((xray ? 1 : hot * 0.85) - morph) * Math.min(1, dt * 2.5);
  // barrido de escáner que cruza el pez en los golpes fuertes
  if (snare > 0.85 && scanAmt < 0.1) { scan = 1.3; scanAmt = 1; }
  scan -= dt * 2.2; scanAmt *= Math.pow(0.4, dt);

  specimens.forEach((s, i) => {
    const u = s.fish.material.uniforms;
    u.uTime.value = t; u.uPix.value = pix;
    u.uMouse.value.copy(ptr.ndc); u.uAspect.value = camera.aspect;
    u.uLens.value += ((ptr.inside ? 1 : 0) - u.uLens.value) * Math.min(1, dt * 6);
    const active = i === current && state !== 'inicio';
    const shown = active || state === 'inicio' || state === 'regresando';
    u.uVis.value += ((shown ? (introOn && !active ? 0.15 : 1) : 0) - u.uVis.value) * Math.min(1, dt * 2);
    const awake = i === hovered && state === 'inicio' && !introOn;
    // al nadar cerca de una criatura se va despertando sola, sin necesidad de apuntarle
    const prox = state === 'inicio' && !introOn ? 1 - THREE.MathUtils.smoothstep(s.fish.position.distanceTo(camera.position), 2.5, 6.5) : 0;
    s.swim.step(dt, active ? (state === 'abismo' ? 1 + bass * 1.5 : 0.6) : 1);
    s.fish.position.lerp(s.swim.pos, Math.min(1, dt * 3));
    s.fish.rotation.set(0, s.swim.yaw, s.swim.pitch);
    if (!active) {
      // en el banco: oscuridad total, sólo se adivinan sus luces; al acercar el cursor se enciende
      s.fish.scale.setScalar(THREE.MathUtils.lerp(s.fish.scale.x, SCHOOL_SCALE * (awake ? 1.12 : 1), Math.min(1, dt * 3)));
      u.uSleep.value += ((awake ? 0.08 : 1 - 0.85 * prox) - u.uSleep.value) * Math.min(1, dt * 4);
      u.uKick.value = awake ? 0.5 : 0;
      u.uWave.value = 0.04 + s.swim.burst * 0.08; u.uSwim.value = 1.6 + s.swim.burst * 3; u.uTurn.value = s.swim.turn * 0.6;
      u.uMorph.value = 0; u.uGlitch.value = 0; u.uScanAmt.value = 0;
      s.tag.style.opacity = state === 'inicio' && !introOn ? (awake ? 1 : Math.max(prox, TOUCH ? 0.45 : 0)) : 0;
    } else {
      if (state === 'entrando' && stateT > 1.3) {
        state = 'abismo';
        document.body.classList.add('abyss');
        document.getElementById('player').classList.add('on');
      }
      s.fish.scale.setScalar(THREE.MathUtils.lerp(s.fish.scale.x, ACTIVE_SCALE, Math.min(1, dt * 1.2)));
      u.uSleep.value += (0 - u.uSleep.value) * Math.min(1, dt * 2);
      u.uKick.value = kick;
      u.uWave.value = 0.05 + bass * 0.25 + s.swim.burst * 0.1;
      u.uSwim.value = 2.0 + s.swim.burst * 3;
      u.uTurn.value = s.swim.turn * 0.6;
      u.uMorph.value = morph;
      u.uGlitch.value = glitch;
      u.uScan.value = scan; u.uScanAmt.value = scanAmt;
      s.tag.style.opacity = 0;
    }
    s.tag.classList.toggle('awake', awake);
    tmp.copy(s.fish.position).add(new THREE.Vector3(0, -s.fish.scale.x * 0.9, 0)).project(camera);
    s.tag.style.left = `${(tmp.x * 0.5 + 0.5) * innerWidth}px`;
    s.tag.style.top = `${(-tmp.y * 0.5 + 0.5) * innerHeight}px`;
  });

  if (state === 'regresando' && stateT > 1.4) { state = 'inicio'; current = -1; }

  // nieve marina: tenue en el banco, viva dentro del visual
  const su = snow.material.uniforms;
  su.uTime.value = t; su.uHat.value = hat; su.uPix.value = pix; su.uCam.value.copy(camera.position);
  su.uVis.value += ((state === 'abismo' ? 1 : 0.45) - su.uVis.value) * Math.min(1, dt);

  // feedback: estelas sólo en el abismo
  bloom.strength = (state === 'inicio' ? 0.6 : 0.42) + kick * 0.55;

  // separación: se empujan suave cuando se acercan demasiado, para que queden repartidas
  for (let i = 0; i < specimens.length; i++) for (let j = i + 1; j < specimens.length; j++) {
    if (i === current || j === current) continue;
    const a = specimens[i].swim.pos, b = specimens[j].swim.pos, v = a.clone().sub(b), d = v.length() || 0.001;
    if (d < SEP) { v.multiplyScalar((SEP - d) * 0.4 * dt / d); a.add(v); b.sub(v); }
  }

  // cámara
  if (state === 'abismo' || state === 'entrando') {
    camTarget.lerp(specimens[current].fish.position, Math.min(1, dt * 1.5));
    orbit.dist += (orbit.distT - orbit.dist) * Math.min(1, dt * 3);
    const yaw = orbit.yaw + Math.sin(t * 0.07) * 0.3;
    camPos.copy(camTarget).add(new THREE.Vector3(Math.sin(yaw) * Math.cos(orbit.pitch), Math.sin(orbit.pitch), Math.cos(yaw) * Math.cos(orbit.pitch)).multiplyScalar(orbit.dist));
  } else {
    // nadar libre: inercia suave, flechas, y una deriva lenta hacia adelante cuando nadie toca nada
    nav.idle += dt;
    const fwd = navForward(), right = new THREE.Vector3(-fwd.z, 0, fwd.x).normalize();
    if (nav.keys.has('ArrowUp')) nav.vel.addScaledVector(fwd, dt * 9);
    if (nav.keys.has('ArrowDown')) nav.vel.addScaledVector(fwd, -dt * 9);
    if (nav.keys.has('ArrowRight')) nav.vel.addScaledVector(right, dt * 9);
    if (nav.keys.has('ArrowLeft')) nav.vel.addScaledVector(right, -dt * 9);
    // imán: la corriente te lleva sola hacia la criatura más a la mano (prefiere la que tienes enfrente).
    // Mientras nadas con la rueda casi no jala, así se siente que navegas tú.
    let tgt = null, best = Infinity;
    for (const s of specimens) {
      const v = s.fish.position.clone().sub(nav.pos), d = v.length() || 0.001;
      const score = d * (2 - v.dot(fwd) / d);
      if (score < best) { best = score; tgt = v; }
    }
    if (tgt) {
      const d = tgt.length();
      const pull = THREE.MathUtils.clamp((d - MAGNET_R) * 0.4, 0, 3) * (nav.idle < 1.2 ? 0.25 : 1);
      nav.vel.addScaledVector(tgt.clone().normalize(), pull * dt);
      if (nav.idle > 3) {
        // sin nadie tocando, la mirada también la busca
        const wy = Math.atan2(-tgt.x, -tgt.z), wp = THREE.MathUtils.clamp(Math.asin(tgt.y / d), -0.6, 0.6);
        const dy = ((wy - nav.yawT + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
        const k = Math.min(1, dt * 0.5);
        nav.yawT += dy * k; nav.pitchT += (wp - nav.pitchT) * k;
      }
    }
    // el agua frena más cerca de una criatura: llegas a verla, no la atraviesas
    const near = specimens.reduce((m, s) => {
      const v = s.fish.position.clone().sub(nav.pos), d = v.length();
      return v.dot(fwd) > 0.8 * d ? Math.min(m, d) : m;   // sólo la que tienes enfrente
    }, Infinity);
    nav.vel.clampLength(0, 6);
    nav.pos.addScaledVector(nav.vel, dt);
    nav.vel.multiplyScalar(Math.pow(near < 3 ? 0.03 : 0.15, dt));
    if (nav.pos.length() > NAV_BOUND) { nav.pos.setLength(NAV_BOUND); nav.vel.multiplyScalar(0.5); }
    nav.yaw += (nav.yawT - nav.yaw) * Math.min(1, dt * 5);
    nav.pitch += (nav.pitchT - nav.pitch) * Math.min(1, dt * 5);
    camPos.copy(nav.pos).add(new THREE.Vector3(0, Math.sin(t * 0.5) * 0.06, 0));
    camTarget.copy(camPos).addScaledVector(navForward(), 6);
  }
  camera.position.lerp(camPos, Math.min(1, dt * (state === 'entrando' ? 1.6 : 1.0)));
  camera.lookAt(camTarget);

  // progreso
  if (audio.duration) document.getElementById('fill').style.width = `${(audio.currentTime / audio.duration) * 100}%`;

  composer.render(dt);
  if (recorder) {
    drawRecFrame();
    const el = (performance.now() - recStart) / 1000;
    document.getElementById('recTime').textContent = `${Math.floor(el / 60)}:${String(Math.floor(el) % 60).padStart(2, '0')}`;
    if (el >= REC_MAX) stopRec();
  }
  requestAnimationFrame(tick);
}

if (window.__dbg) Object.assign(window.__dbg, { tick: () => { const r = requestAnimationFrame; window.requestAnimationFrame = () => 0; tick(); window.requestAnimationFrame = r; }, enterFish, nextTrack, backHome, setFx, fx, ptr, orbit, nav, getState: () => ({ state, current }) });
build().then(() => requestAnimationFrame(tick)).catch(err => {
  document.getElementById('loading').textContent = t('loadFail');
  console.error(err);
});
