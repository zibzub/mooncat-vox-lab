import {
  ACESFilmicToneMapping,
  Box3,
  Color,
  DataTexture,
  DirectionalLight,
  Group,
  HemisphereLight,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  PerspectiveCamera,
  RGBFormat,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { markVertexColors } from './vox.js'

const MODEL_SIZE = 10

function gradientTexture(ramp) {
  const bytes = new Uint8Array([
    ramp.shadow, ramp.shadow, ramp.shadow,
    ramp.midtone, ramp.midtone, ramp.midtone,
    ramp.highlight, ramp.highlight, ramp.highlight,
  ])
  const texture = new DataTexture(bytes, 3, 1, RGBFormat)
  texture.magFilter = NearestFilter
  texture.minFilter = NearestFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return texture
}

function disposeObject(object, retainedMaterials = new Set()) {
  object.traverse((child) => {
    if (!child.isMesh) return
    child.geometry?.dispose()
    if (Array.isArray(child.material)) child.material.forEach((material) => {
      if (!retainedMaterials.has(material)) material.dispose()
    })
    else if (child.material && !retainedMaterials.has(child.material)) child.material.dispose()
  })
}

export function createViewer(container, setMessage) {
  const scene = new Scene()
  const camera = new PerspectiveCamera(32, 1, 0.01, 1000)
  camera.position.set(16, 11, 16)

  const renderer = new WebGLRenderer({ antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1
  container.appendChild(renderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.minDistance = 0.4
  controls.maxDistance = 80
  controls.target.set(0, 0, 0)

  const modelRoot = new Group()
  scene.add(modelRoot)

  const hemisphere = new HemisphereLight(0xd5e6ff, 0x252b38, 0.8)
  const key = new DirectionalLight(0xffffff, 2.2)
  key.position.set(2.5, 4, 3)
  const fill = new DirectionalLight(0x91a8cc, 0.35)
  fill.position.set(-2, 1, -3)
  scene.add(hemisphere, key, fill)

  const renderPass = new RenderPass(scene, camera)
  const bloomPass = new UnrealBloomPass(new Vector3(1, 1, 1), 0.8, 0.4, 0.8)
  const composer = new EffectComposer(renderer)
  composer.addPass(renderPass)
  composer.addPass(bloomPass)

  const gradientMap = gradientTexture({ shadow: 75, midtone: 190, highlight: 255 })
  const toonMaterial = new MeshToonMaterial({ vertexColors: true, gradientMap })
  const unlitMaterial = new MeshBasicMaterial({ vertexColors: true })
  let currentObject = null
  let currentMode = 'toon'
  let bloomEnabled = false

  function setMaterials(mode) {
    currentMode = mode
    modelRoot.traverse((child) => {
      if (child.isMesh) child.material = mode === 'unlit' ? unlitMaterial : toonMaterial
    })
  }

  function setRamp(ramp) {
    gradientMap.image.data.set([
      ramp.shadow, ramp.shadow, ramp.shadow,
      ramp.midtone, ramp.midtone, ramp.midtone,
      ramp.highlight, ramp.highlight, ramp.highlight,
    ])
    gradientMap.needsUpdate = true
  }

  function resize() {
    const width = Math.max(container.clientWidth, 1)
    const height = Math.max(container.clientHeight, 1)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    composer.setSize(width, height)
  }

  function applyState(state) {
    scene.background = new Color(state.background)
    hemisphere.intensity = state.lights.hemisphere
    key.intensity = state.lights.key
    fill.intensity = state.lights.fill
    bloomEnabled = state.bloom.enabled
    bloomPass.enabled = true
    bloomPass.strength = state.bloom.strength
    bloomPass.threshold = state.bloom.threshold
    bloomPass.radius = state.bloom.radius
    setRamp(state.ramp)
    setMaterials(state.mode)
  }

  async function setObject(nextObject, id) {
    markVertexColors(nextObject)
    const bounds = new Box3().setFromObject(nextObject)
    const center = bounds.getCenter(new Vector3())
    const size = bounds.getSize(new Vector3())
    const largestDimension = Math.max(size.x, size.y, size.z, 1)
    nextObject.position.sub(center)
    nextObject.scale.setScalar(MODEL_SIZE / largestDimension)
    nextObject.name = `Rescue ${id}`

    if (currentObject) {
      modelRoot.remove(currentObject)
      disposeObject(currentObject, new Set([toonMaterial, unlitMaterial]))
    }
    currentObject = nextObject
    modelRoot.add(currentObject)
    controls.reset()
    controls.target.set(0, 0, 0)
    setMaterials(currentMode)
  }

  function render() {
    controls.update()
    if (bloomEnabled) composer.render()
    else renderer.render(scene, camera)
  }

  const resizeObserver = new ResizeObserver(() => window.requestAnimationFrame(resize))
  resizeObserver.observe(container)
  window.addEventListener('resize', resize)
  renderer.setAnimationLoop(render)
  resize()

  return {
    applyState,
    load: async (loaded) => {
      setMessage('Building VOX mesh…', 'loading')
      await setObject(loaded.object, loaded.id)
      setMessage(`Loaded rescue ${loaded.id}`, 'success')
    },
    error: (message) => setMessage(message, 'error'),
    destroy: () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', resize)
      renderer.setAnimationLoop(null)
      if (currentObject) disposeObject(currentObject, new Set([toonMaterial, unlitMaterial]))
      gradientMap.dispose()
      toonMaterial.dispose()
      unlitMaterial.dispose()
      composer.dispose()
      renderer.dispose()
    },
  }
}
