// Plateau de dés 3D (niveau 1 de la version 3D) — three.js + cannon-es.
// Principe "dés truqués proprement" (standard du genre) : on pré-simule le lancer en
// invisible, on note quelle face de chaque dé finit vers le haut, on ré-étiquette les
// textures pour que cette face porte la valeur DÉCIDÉE PAR LE MOTEUR, puis on rejoue la
// trajectoire enregistrée à l'écran. Physique réelle à l'œil, résultat contrôlé.
// API : Dice3D.mount(container, {hero}) -> { roll(values) => Promise, dispose() }
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import * as CANNON from 'cannon-es'

// Styles de dés vérifiés (leaflets scannés) : HH = dé violet, hache blanche (1-3),
// fer à cheval cyan (4-5), citrouille orange (6). BW = dé noir, œil vert (1-2),
// bâtons cyan (3-5), Widow rouge (6).
const HERO_DICE = {
  hh: { base: ['#6f4fa8', '#573c8c'], faces: v => v <= 3 ? { g: '🪓', c: '#f3ede2' } : v <= 5 ? { g: 'Ω', c: '#3fb6e8' } : { g: '🎃', c: '#ef6b2b' } },
  bw: { base: ['#26242a', '#141317'], faces: v => v <= 2 ? { g: '👁', c: '#9fc93c' } : v <= 5 ? { g: '✕', c: '#56bcd8' } : { g: '⧗', c: '#e2211f' } },
}

const DIE = 1.15                 // demi-jeu visuel : taille d'un dé (unités monde)
const STEP = 1 / 60
const MAX_STEPS = 620            // ~10 s de sim max — en pratique ça dort en 2-4 s
// Axes locaux des 6 faces, dans l'ordre des groupes de BoxGeometry : +x -x +y -y +z -z
const FACE_AXES = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]

function faceTexture(style, value) {
  const cv = document.createElement('canvas')
  cv.width = cv.height = 128
  const ctx = cv.getContext('2d')
  const grad = ctx.createLinearGradient(0, 0, 0, 128)
  grad.addColorStop(0, style.base[0]); grad.addColorStop(1, style.base[1])
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 128, 128)
  // liseré sombre pour marquer l'arête
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 7; ctx.strokeRect(3, 3, 122, 122)
  const f = style.faces(value)
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillStyle = f.c
  ctx.font = f.g.length > 1 || f.g.charCodeAt(0) > 0x2500 ? '64px "Segoe UI Emoji", sans-serif' : 'bold 74px "Segoe UI", sans-serif'
  ctx.fillText(f.g, 64, 60)
  ctx.font = 'bold 24px "Segoe UI", sans-serif'
  ctx.fillStyle = f.c
  ctx.fillText(String(value), 106, 106)
  const tx = new THREE.CanvasTexture(cv)
  tx.colorSpace = THREE.SRGBColorSpace
  return tx
}

export function mount(container, opts = {}) {
  const heroId = opts.hero || 'hh'
  const style = HERO_DICE[heroId] || HERO_DICE.hh
  const W = container.clientWidth || 900, H = container.clientHeight || 420

  // ---------- scène three ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(W, H)
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.appendChild(renderer.domElement)
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100)
  camera.position.set(0, 10.5, 7.6)
  camera.lookAt(0, 0, 0.2)
  scene.add(new THREE.HemisphereLight(0xbfb3d8, 0x1a1426, 1.15))
  const sun = new THREE.DirectionalLight(0xffffff, 1.6)
  sun.position.set(4, 12, 5)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.left = -9; sun.shadow.camera.right = 9
  sun.shadow.camera.top = 9; sun.shadow.camera.bottom = -9
  scene.add(sun)

  // feutrine du plateau + rebord
  const TRAY_W = 6.4, TRAY_D = 3.4  // demi-dimensions
  const felt = new THREE.Mesh(
    new THREE.BoxGeometry(TRAY_W * 2, 0.3, TRAY_D * 2),
    new THREE.MeshStandardMaterial({ color: 0x241d30, roughness: 0.95 }))
  felt.position.y = -0.15
  felt.receiveShadow = true
  scene.add(felt)
  const rimMat = new THREE.MeshStandardMaterial({ color: 0x3a2d52, roughness: 0.7 })
  for (const [x, z, w, d] of [[0, -TRAY_D - 0.22, TRAY_W + 0.44, 0.22], [0, TRAY_D + 0.22, TRAY_W + 0.44, 0.22], [-TRAY_W - 0.22, 0, 0.22, TRAY_D], [TRAY_W + 0.22, 0, 0.22, TRAY_D]]) {
    const rim = new THREE.Mesh(new THREE.BoxGeometry(w * 2, 0.62, d * 2), rimMat)
    rim.position.set(x, 0.16, z)
    rim.castShadow = rim.receiveShadow = true
    scene.add(rim)
  }

  // ---------- monde physique ----------
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -34, 0) })
  world.allowSleep = true
  world.defaultContactMaterial.restitution = 0.38
  world.defaultContactMaterial.friction = 0.22
  const ground = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() })
  ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
  world.addBody(ground)
  for (const [x, z, ry] of [[0, -TRAY_D - 0.1, 0], [0, TRAY_D + 0.1, 0], [-TRAY_W - 0.1, 0, Math.PI / 2], [TRAY_W + 0.1, 0, Math.PI / 2]]) {
    const wall = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Box(new CANNON.Vec3(TRAY_W + 1, 4, 0.1)) })
    wall.position.set(x, 2, z)
    wall.quaternion.setFromEuler(0, ry, 0)
    world.addBody(wall)
  }

  // ---------- les 5 dés ----------
  const texCache = {}
  const tex = v => texCache[v] || (texCache[v] = faceTexture(style, v))
  const geo = new RoundedBoxGeometry(DIE, DIE, DIE, 3, 0.14)
  const dice = []
  for (let i = 0; i < 5; i++) {
    const mats = Array.from({ length: 6 }, (_, f) => new THREE.MeshStandardMaterial({ map: tex((f % 6) + 1), roughness: 0.35, metalness: 0.05 }))
    const mesh = new THREE.Mesh(geo, mats)
    mesh.castShadow = mesh.receiveShadow = true
    mesh.visible = false
    scene.add(mesh)
    const body = new CANNON.Body({ mass: 1, shape: new CANNON.Box(new CANNON.Vec3(DIE / 2, DIE / 2, DIE / 2)) })
    body.sleepSpeedLimit = 0.55
    body.sleepTimeLimit = 0.3
    world.addBody(body)
    dice.push({ mesh, body, mats })
  }
  renderer.render(scene, camera)

  let raf = null
  function roll(values) {
    if (raf) cancelAnimationFrame(raf)
    // 1. position de départ : les dés arrivent de la droite, en éventail, avec du spin
    dice.forEach((d, i) => {
      d.body.position.set(TRAY_W - 0.6, 1.6 + i * 1.15, -TRAY_D + 0.8 + i * (TRAY_D * 2 - 1.6) / 4)
      d.body.velocity.set(-(11 + Math.random() * 5), -1, (Math.random() - 0.5) * 4)
      d.body.angularVelocity.set((Math.random() - 0.5) * 26, (Math.random() - 0.5) * 26, (Math.random() - 0.5) * 26)
      d.body.quaternion.setFromEuler(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28)
      d.body.wakeUp()
    })
    // 2. pré-simulation invisible : on enregistre chaque frame
    const frames = []
    for (let s = 0; s < MAX_STEPS; s++) {
      world.step(STEP)
      frames.push(dice.map(d => [d.body.position.x, d.body.position.y, d.body.position.z,
        d.body.quaternion.x, d.body.quaternion.y, d.body.quaternion.z, d.body.quaternion.w]))
      if (dice.every(d => d.body.sleepState === CANNON.Body.SLEEPING)) break
    }
    // 3. quelle face a fini vers le haut ? → cette face reçoit la valeur demandée
    dice.forEach((d, i) => {
      const q = d.body.quaternion
      let up = 0, best = -2
      FACE_AXES.forEach((ax, f) => {
        const w = q.vmult(new CANNON.Vec3(ax[0], ax[1], ax[2]))
        if (w.y > best) { best = w.y; up = f }
      })
      const want = values[i]
      const rest = [1, 2, 3, 4, 5, 6].filter(v => v !== want)
      d.mats[up].map = tex(want)
      d.mats.forEach((m, f) => { if (f !== up) m.map = tex(rest.pop()) })
      d.mats.forEach(m => { m.needsUpdate = true })
      d.mesh.visible = true
    })
    // 4. replay à l'écran de la trajectoire enregistrée
    return new Promise(resolve => {
      let f = 0, t0 = null
      const play = (ts) => {
        if (t0 === null) t0 = ts
        f = Math.min(frames.length - 1, Math.round((ts - t0) / (STEP * 1000)))
        frames[f].forEach((p, i) => {
          dice[i].mesh.position.set(p[0], p[1], p[2])
          dice[i].mesh.quaternion.set(p[3], p[4], p[5], p[6])
        })
        renderer.render(scene, camera)
        if (f < frames.length - 1) raf = requestAnimationFrame(play)
        else { raf = null; resolve() }
      }
      raf = requestAnimationFrame(play)
    })
  }

  return {
    roll,
    dispose() {
      if (raf) cancelAnimationFrame(raf)
      renderer.dispose()
      container.removeChild(renderer.domElement)
    },
  }
}
