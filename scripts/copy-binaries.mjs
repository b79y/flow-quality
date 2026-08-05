#!/usr/bin/env node
// Copies the bundled ffmpeg / ffprobe binaries into resources/bin so the
// packaged app and the dev build can both resolve them deterministically.
import { createRequire } from 'node:module'
import { copyFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const destDir = join(root, 'resources', 'bin')
mkdirSync(destDir, { recursive: true })

const copied = []
const tryResolve = (pkg) => {
  try {
    return require.resolve(pkg)
  } catch {
    return null
  }
}

const ffmpegPath = (() => {
  try {
    return require('ffmpeg-static') || null
  } catch {
    return null
  }
})()
if (ffmpegPath && existsSync(ffmpegPath)) {
  copyFileSync(ffmpegPath, join(destDir, 'ffmpeg.exe'))
  copied.push('ffmpeg.exe')
}

// ffprobe-static@3.1 ships no binary; @ffprobe-installer does.
let ffprobePath = tryResolve('@ffprobe-installer/ffprobe')
if (ffprobePath) {
  try {
    const pkg = require('@ffprobe-installer/ffprobe')
    ffprobePath = pkg.path
  } catch {
    ffprobePath = null
  }
}
if (!ffprobePath || !existsSync(ffprobePath)) {
  ffprobePath = tryResolve('@ffprobe-installer/win32-x64/ffprobe.exe')
}
if (ffprobePath && existsSync(ffprobePath)) {
  copyFileSync(ffprobePath, join(destDir, 'ffprobe.exe'))
  copied.push('ffprobe.exe')
}

console.log(`[copy-binaries] ${copied.length ? copied.join(', ') : 'no binaries found (ffmpeg-static may have failed to download)'}`)
if (!copied.length) process.exitCode = 1
