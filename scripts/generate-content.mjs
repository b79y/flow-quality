#!/usr/bin/env node
// Generates the bundled content library shipped inside the app and listed
// on the Downloads page. Everything is produced locally - real LUTs (.cube),
// DaVinci Resolve DCTLs, PNG overlays, WAV sound FX, motion-blur preset files
// and export-guide documents - plus the packs.json catalog.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packsRoot = join(root, 'resources', 'content', 'packs')
const PACKS = []

// ---------------------------------------------------------------- utils
function pack(id, name, category, description, version, files) {
  const dir = join(packsRoot, id)
  PACKS.push({ id, name, category, description, sizeMB: 0, version, files: [] })
  for (const [rel, bytes] of files) {
    const p = join(dir, rel)
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, bytes)
    PACKS[PACKS.length - 1].files.push({ path: rel, name: rel.split('/').pop(), sizeBytes: Buffer.byteLength(bytes) })
    PACKS[PACKS.length - 1].sizeMB += Buffer.byteLength(bytes) / (1024 * 1024)
  }
  PACKS[PACKS.length - 1].sizeMB = Math.max(0.1, Math.round(PACKS[PACKS.length - 1].sizeMB * 10) / 10)
}

// ---------------------------------------------------------------- LUTs (.cube)
function cubeLut(name, size, fn) {
  let out = ''
  out += 'TITLE "' + name + '"\n'
  out += 'LUT_3D_SIZE ' + size + '\n'
  out += 'DOMAIN_MIN 0.0 0.0 0.0\n'
  out += 'DOMAIN_MAX 1.0 1.0 1.0\n'
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const [R, G, B] = fn(r / (size - 1), g / (size - 1), b / (size - 1))
        out += R.toFixed(6) + ' ' + G.toFixed(6) + ' ' + B.toFixed(6) + '\n'
      }
    }
  }
  return out
}

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const sat = (c, s) => {
  const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  return [l + (c[0] - l) * s, l + (c[1] - l) * s, l + (c[2] - l) * s]
}
const blend = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
const curve = (x, k) => (x < 0.5 ? Math.pow(2 * x, k) / 2 : 1 - Math.pow(2 * (1 - x), k) / 2)
const add = (c, d) => [c[0] + d, c[1] + d, c[2] + d]
const warm = (c) => [clamp01(c[0] * 1.08), clamp01(c[1] * 1.02), clamp01(c[2] * 0.9)]
const cool = (c) => [clamp01(c[0] * 0.92), clamp01(c[1] * 1.0), clamp01(c[2] * 1.12)]
const tealOrange = (c) => {
  const x = sat(c, 1.12)
  return [clamp01(x[0] * 1.1), clamp01(x[1] * 0.98), clamp01(x[2] * 1.05 + 0.015)]
}
const desaturate = (c) => sat(c, 0.55)

const luts = {
  'Cinematic-Vintage': (r, g, b) => add(curve(cool(warm([r, g, b])), 0.92), 0.02),
  'Teal-Orange': (r, g, b) => tealOrange([r, g, b]),
  'Warm-Sunset': (r, g, b) => add(curve(warm(sat([r, g, b], 1.18)), 0.96), 0.01),
  'Mood-Noir': (r, g, b) => {
    let c = desaturate([r, g, b])
    c = curve(c, 1.18)
    return cool(add(c, -0.01))
  },
  'Soft-Pastel': (r, g, b) => blend([r, g, b], [0.98, 0.96, 1.0], 0.08),
  'TikTok-Pop': (r, g, b) => add(sat(curve([r, g, b], 0.9), 1.3), 0.02),
  'Crisp-Daylight': (r, g, b) => add(curve(sat([r, g, b], 1.1), 0.95), 0.03),
  'Neon-Nights': (r, g, b) => sat(curve(cool(sat([r, g, b], 1.25)), 0.85), 1.2),
  'Bleach-Desat': (r, g, b) => add(curve(desaturate([r, g, b]), 0.85), 0.05),
}

const cineFiles = Object.entries(luts).slice(0, 5).map(([n, fn]) => [n + '.cube', cubeLut(n, 33, fn)])
const mobileFiles = Object.entries(luts).slice(5).map(([n, fn]) => [n + '.cube', cubeLut(n, 33, fn)])

pack('lut-cinematic', 'Cinematic LUT Pack', 'lut',
  'Five pro color grades: vintage, teal & orange, sunset, noir and pastel.',
  '1.0', cineFiles)
pack('lut-mobile', 'Creator Mobile LUT Pack', 'lut',
  'Punchy, platform-first looks for TikTok, Shorts and Reels.',
  '1.0', mobileFiles)

// ---------------------------------------------------------------- DCTL (Resolve)
function dctl(title, desc, body) {
  return '__DEVICE__\nColorSpace = "NoOp"\nTitle = "' + title + '"\nDescription = "' + desc + '"\n\n__CONST__\n\n__END__\n\n__KERNEL__\n\n__DEVICE__ float3 apply(float3 c)\n{\n    ' + body + '\n}\n\n__DEVICE__ void transform(PS_INPUT input, __TEXTURE__ tex, __CALLBACK_INSTANCE__ instance, float4 result)\n{\n    float3 col = _fetchPixel(tex, input.pos).rgb;\n    col = apply(col);\n    result.rgb = col;\n    result.a = 1.0;\n}\n__END__\n'
}

pack('dctl-resolve', 'DaVinci Resolve DCTL Pack', 'presetResolve',
  'Real .dctl color transforms for Resolve - soft fade, punch, filmic contrast and bleach.',
  '1.0', [
    ['Filmic-Contrast.dctl', dctl('Filmic Contrast', 'Gentle S-curve with soft shoulder',
      'c.r = 0.5 + (c.r - 0.5) * 1.25; c.g = 0.5 + (c.g - 0.5) * 1.25; c.b = 0.5 + (c.b - 0.5) * 1.25; float l = dot(c, make_float3(0.2126, 0.7152, 0.0722)); c = c * (0.9 + 0.15 * l); return c;')],
    ['Soft-Fade.dctl', dctl('Soft Fade', 'Elevated blacks, lowered whites',
      'c.r = 0.05 + c.r * 0.92; c.g = 0.05 + c.g * 0.92; c.b = 0.05 + c.b * 0.92; float l = dot(c, make_float3(0.2126, 0.7152, 0.0722)); c = c + (l - c) * 0.12; return c;')],
    ['Punchy-Saturation.dctl', dctl('Punchy Saturation', 'Vibrant, skin-safe boost',
      'float l = dot(c, make_float3(0.2126, 0.7152, 0.0722)); c = l + (c - l) * 1.22; c.r = clamp(c.r, 0.0, 1.0); c.g = clamp(c.g, 0.0, 1.0); c.b = clamp(c.b, 0.0, 1.0); return c;')],
    ['Bleach-Pass.dctl', dctl('Bleach Pass', 'Desaturated, lifted blacks',
      'float l = dot(c, make_float3(0.2126, 0.7152, 0.0722)); c = l + (c - l) * 0.62; c.r = 0.06 + c.r * 0.9; c.g = 0.06 + c.g * 0.9; c.b = 0.06 + c.b * 0.9; return c;')],
  ])

// ---------------------------------------------------------------- Motion blur presets
const blurPresets = [
  ['Cinematic.json', { preset: 'cinematic', intensity: 4, trailLength: 4, samples: 6, direction: 'auto', smartSpeed: true }],
  ['Light.json', { preset: 'light', intensity: 2, trailLength: 2, samples: 3, direction: 'auto', smartSpeed: true }],
  ['Strong.json', { preset: 'strong', intensity: 8, trailLength: 7, samples: 10, direction: 'auto', smartSpeed: true }],
  ['Action.json', { preset: 'custom', intensity: 6, trailLength: 5, samples: 8, direction: 'horizontal', smartSpeed: true }],
]
pack('blur-packs', 'Motion Blur Preset Packs', 'motionBlur',
  'Tuned motion-blur settings for games, montages and fast transitions.',
  '1.0', blurPresets.map(([n, v]) => [n, JSON.stringify(v, null, 2)]))

// ---------------------------------------------------------------- PNG overlays
function png(width, height, pixelFn) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const raw = Buffer.alloc(height * (1 + width * 4))
  let o = 0
  for (let y = 0; y < height; y++) {
    raw[o++] = 0
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y)
      raw[o++] = Math.round(r)
      raw[o++] = Math.round(g)
      raw[o++] = Math.round(b)
      raw[o++] = Math.round(a)
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length, 0)
    const typeBuf = Buffer.from(type, 'ascii')
    const crcBuf = Buffer.alloc(4)
    crcBuf.writeUInt32BE(zlib.crc32(Buffer.concat([typeBuf, data])) >>> 0, 0)
    return Buffer.concat([len, typeBuf, data, crcBuf])
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

const W = 1080
const H = 1920

pack('overlay-basic', 'Overlay Essentials', 'overlay',
  'Vignette, warm light leak, scanlines, letterbox bars and a rule-of-thirds grid.',
  '1.0', [
    ['Vignette.png', png(W, H, (x, y) => {
      const dx = x / W - 0.5, dy = y / H - 0.5
      const d = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 2.4)
      return [0, 0, 0, Math.pow(d, 2.6) * 255]
    })],
    ['Light-Leak.png', png(W, H, (x, y) => {
      const beam = Math.exp(-Math.pow((x / W - 0.18) * 1.6, 2)) * Math.exp(-Math.pow((y / H - 0.25) * 1.1, 2))
      return [255, 170, 90, Math.min(255, beam * 170)]
    })],
    ['Scanlines.png', png(W, H, (_x, y) => [0, 0, 0, y % 4 < 2 ? 26 : 0])],
    ['Letterbox.png', png(W, H, (_x, y) => {
      const barH = H * 0.12
      return [0, 0, 0, y < barH || y > H - barH ? 255 : 0]
    })],
    ['Rule-of-Thirds.png', png(W, H, (x, y) => {
      const thirdW = W / 3, thirdH = H / 3
      const onW = x % thirdW < 2, onH = y % thirdH < 2
      return [255, 255, 255, onW || onH ? 120 : 0]
    })],
  ])

// ---------------------------------------------------------------- WAV sound FX
function wav(samples) {
  const sr = 44100
  const n = samples.length
  const data = Buffer.alloc(n * 2)
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    data.writeInt16LE(Math.round(s * 32767), i * 2)
  }
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(sr, 24)
  header.writeUInt32LE(sr * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}

const SR = 44100
const T = (s) => Math.floor(s * SR)
function noiseGen() {
  let s = 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return (s / 4294967296) * 2 - 1 }
}

function whoosh(dur, sweep) {
  const rnd = noiseGen()
  const out = []
  for (let i = 0; i < T(dur); i++) {
    const t = i / T(dur)
    const env = Math.pow(Math.sin(Math.PI * t), 1.8)
    const f = sweep(t)
    const mod = 0.5 + 0.5 * Math.sin(2 * Math.PI * f * t)
    out.push(rnd() * env * (0.55 + 0.45 * mod))
  }
  return wav(out)
}
function riser(dur, f0, f1) {
  const rnd = noiseGen()
  const out = []
  for (let i = 0; i < T(dur); i++) {
    const t = i / T(dur)
    const env = Math.pow(t, 2)
    const f = f0 + (f1 - f0) * t
    out.push((rnd() * 0.25 + Math.sin(2 * Math.PI * f * t) * 0.75) * env)
  }
  return wav(out)
}
function impact() {
  const out = []
  for (let i = 0; i < T(0.7); i++) {
    const t = i / T(0.7)
    const env = Math.exp(-t * 7)
    const thump = Math.sin(2 * Math.PI * (70 - 25 * t) * t) * env
    const burst = noiseGen() * Math.exp(-t * 22) * 0.5
    out.push(thump * 0.8 + burst)
  }
  return wav(out)
}
function shimmer(dur) {
  const out = []
  for (let i = 0; i < T(dur); i++) {
    const t = i / T(dur)
    const env = Math.pow(Math.sin(Math.PI * t), 2.2)
    let v = 0
    for (const f of [880, 1320, 1760, 2200]) v += Math.sin(2 * Math.PI * f * t)
    v /= 4
    out.push(v * env * (Math.sin(2 * Math.PI * 13 * t) * 0.25 + 1) * 0.5)
  }
  return wav(out)
}

pack('soundfx-transitions', 'Transition Sound FX', 'soundfx',
  'Six production whooshes, risers and hits - perfect for cuts and transitions.',
  '1.0', [
    ['Whoosh-Short.wav', whoosh(0.5, () => 400)],
    ['Whoosh-Long.wav', whoosh(1.2, (t) => 300 + 700 * t)],
    ['Swoosh-Fast.wav', whoosh(0.3, (t) => 900 - 500 * t)],
    ['Riser-Uplift.wav', riser(1.6, 160, 1400)],
    ['Impact-Hit.wav', impact()],
    ['Shimmer-Sparkle.wav', shimmer(1.4)],
  ])

// ---------------------------------------------------------------- Guides + templates
function guideMd(title, body) {
  return '# ' + title + '\n\n' + body
}
pack('guide-upload', 'Platform Upload Guides', 'exportGuide',
  'The exact upload recipes for TikTok, Shorts and Reels.',
  '1.0', [
    ['TikTok-Guide.md', guideMd('TikTok Upload Guide',
      '**Resolution:** 1080x1920 (9:16)\n**Frame rate:** 60 FPS\n**Codec:** H.264\n**Bitrate:** ~8 Mbps (1080p60)\n**Container:** MP4\n**Duration:** up to 10 minutes\n**Size limit:** 1 GB\n\n**Pro tip:** Export at 1080p - higher resolutions get re-compressed by TikTok. Use 60 FPS for smooth motion.')],
    ['YouTube-Shorts-Guide.md', guideMd('YouTube Shorts Upload Guide',
      '**Resolution:** 1080x1920 (9:16)\n**Frame rate:** 60 FPS\n**Codec:** H.264\n**Bitrate:** ~8-12 Mbps\n**Container:** MP4\n**Duration:** up to 3 minutes\n\n**Pro tip:** Shorts re-compress aggressively; avoid heavy sharpening before upload.')],
    ['Instagram-Reels-Guide.md', guideMd('Instagram Reels Upload Guide',
      '**Resolution:** 1080x1920 (9:16)\n**Frame rate:** 60 FPS\n**Codec:** H.264\n**Bitrate:** ~6-8 Mbps\n**Container:** MP4\n**Duration:** up to 90 seconds\n\n**Pro tip:** Reels caps at 1080p and re-encodes; keep bitrate moderate to avoid double-compression artifacts.')],
  ])
pack('template-thumbnails', 'Creator Templates', 'template',
  'Storyboard, hook and thumbnail checklists to speed up your workflow.',
  '1.0', [
    ['Storyboard-Template.csv', 'scene,shot,angle,motion,caption,notes\n1,wide,low,smooth zoom,HOOK: 0-3s,"strong visual"\n2,medium,eye level,subtle push,context,fast\n3,close,dutch angle,shake,payoff,slow-mo\n'],
    ['Hook-Swipe-File.md', guideMd('Hook Swipe File',
      '1. Pattern interrupt - change scene in first 3s\n2. Text on screen in first 2s\n3. Fast cut every 1-2s\n4. Loop-friendly ending\n\nSave your best hooks here.')],
    ['Thumbnail-Checklist.md', guideMd('Thumbnail Checklist',
      '- [ ] Contrast vs. feed background\n- [ ] One focal point\n- [ ] 3-4 words max\n- [ ] Face/emotion visible\n- [ ] Readable at small size\n')],
  ])
pack('preset-premiere', 'Premiere Pro Import Pack', 'presetPremiere',
  'How to apply every bundled LUT with Lumetri Color, plus export presets.',
  '1.0', [
    ['Install-Guide.md', guideMd('Premiere Pro - Install LUTs & Export Presets',
      '**Apply a LUT (Lumetri Color)**\n1. Effects panel -> Lumetri Color\n2. Creative tab -> Look -> Browse\n3. Pick any .cube from this pack\n\n**Recommended export (TikTok/Shorts/Reels)**\n- Format: H.264\n- Resolution: 1080x1920\n- Frame rate: 60 FPS\n- Bitrate: 8 Mbps VBR 2-pass\n- Profile: High\n- Audio: AAC 128 kbps')],
    ['YouTube-Preset.md', guideMd('YouTube Shorts Preset', 'H.264 - 1080x1920 - 60fps - 8-12 Mbps - AAC 128k\nUse the High profile, VBR 2-pass.')],
  ])
pack('preset-ae', 'After Effects Export Pack', 'presetAe',
  'Render settings for smooth 60 FPS motion-blur exports from AE.',
  '1.0', [
    ['Render-Guide.md', guideMd('After Effects - Export Guide',
      '1. Enable Motion Blur on layers (toggle the motion blur switch)\n2. Render Queue -> H.264 preset\n3. Output: 1080x1920, 60 FPS\n4. Bitrate: 8-10 Mbps VBR\n5. Add a SharpMotion LUT in the Color section if needed')],
    ['FrameBlend-Notes.md', guideMd('Frame Blending Notes',
      'For clips interpolated to 60 FPS in AE, use "Pixel Motion" frame blending rather than frame duplication to keep motion smooth.')],
  ])

// ---------------------------------------------------------------- catalog
for (const p of PACKS) p.sizeMB = Math.round(p.sizeMB * 10) / 10
writeFileSync(join(packsRoot, 'packs.json'), JSON.stringify(PACKS, null, 2))
writeFileSync(join(packsRoot, 'README.md'), 'FrameForge content packs - generated locally by scripts/generate-content.mjs.\n')

let total = 0
for (const p of PACKS) total += p.sizeMB
console.log('[generate-content] ' + PACKS.length + ' packs - ' + total.toFixed(1) + ' MB total -> ' + packsRoot)
