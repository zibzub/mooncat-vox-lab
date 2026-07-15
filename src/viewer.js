import {
  Box3,
  Color,
  DataTexture,
  DirectionalLight,
  Group,
  HemisphereLight,
  MeshBasicMaterial,
  MeshStandardMaterial,
  MeshToonMaterial,
  NoToneMapping,
  NearestFilter,
  PerspectiveCamera,
  RedFormat,
  Scene,
  ShaderChunk,
  SRGBColorSpace,
  UnsignedByteType,
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
  const bytes = new Uint8Array([ramp.shadow, ramp.midtone, ramp.highlight])
  const texture = new DataTexture(bytes, 3, 1, RedFormat, UnsignedByteType)
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
  renderer.toneMapping = NoToneMapping
  container.appendChild(renderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.minDistance = 0.4
  controls.maxDistance = 80
  controls.target.set(0, 0, 0)

  const modelRoot = new Group()
  scene.add(modelRoot)

  const hemisphere = new HemisphereLight(0xffffff, 0x111111, 0.5)
  const key = new DirectionalLight(0xffffff, 1.6)
  const fill = new DirectionalLight(0xffffff, 0.15)
  scene.add(hemisphere, key, fill)

  const renderPass = new RenderPass(scene, camera)
  const bloomPass = new UnrealBloomPass(new Vector3(1, 1, 1), 0.8, 0.4, 0.8)
  const composer = new EffectComposer(renderer)
  composer.addPass(renderPass)
  composer.addPass(bloomPass)

  const gradientMap = gradientTexture({ shadow: 75, midtone: 190, highlight: 255 })
  const toonMaterial = new MeshToonMaterial({ vertexColors: true, gradientMap })
  let shadowColorRetention = 0
  let toonShaderUniform = null
  toonMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.shadowColorRetention = { value: shadowColorRetention }
    toonShaderUniform = shader.uniforms.shadowColorRetention

    const originalChunk = ShaderChunk.gradientmap_pars_fragment
    const target = 'return vec3( texture2D( gradientMap, coord ).r );'

    if (!originalChunk.includes(target)) {
      console.warn('Shadow retention shader patch target was not found.')
    }

    const retainedGradientChunk = originalChunk.replace(
      target,
      `float gradientValue = texture2D( gradientMap, coord ).r;

		gradientValue = mix(
			gradientValue,
			1.0,
			shadowColorRetention
		);

		return vec3( gradientValue );`,
    )

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <gradientmap_pars_fragment>',
      `uniform float shadowColorRetention;
${retainedGradientChunk}`,
    )
  }
  const legacyMaterial = new MeshStandardMaterial({ vertexColors: true })
  const neutralMaterial = new MeshStandardMaterial({ vertexColors: true, metalness: 0, roughness: 0.92 })
  const unlitMaterial = new MeshBasicMaterial({ vertexColors: true })
  let currentObject = null
  let currentPipeline = 'mr'
  let bloomEnabled = false

  function setMaterials(pipeline) {
    currentPipeline = pipeline
    const material = pipeline === 'legacy'
      ? legacyMaterial
      : pipeline === 'neutral'
        ? neutralMaterial
        : pipeline === 'unlit' ? unlitMaterial : toonMaterial
    const colorAttribute = pipeline === 'legacy' ? 'colorRaw' : 'colorLinear'
    modelRoot.traverse((child) => {
      if (!child.isMesh) return
      const attribute = child.geometry.getAttribute(colorAttribute)
      if (attribute) child.geometry.setAttribute('color', attribute)
      child.material = material
    })
  }

  function setRamp(ramp) {
    gradientMap.image.data.set([ramp.shadow, ramp.midtone, ramp.highlight])
    gradientMap.needsUpdate = true
  }

  function setShadowColorRetention(value) {
    shadowColorRetention = Math.min(1, Math.max(0, Number(value) || 0))
    if (toonShaderUniform) toonShaderUniform.value = shadowColorRetention
  }

  function resize() {
    const width = Math.max(container.clientWidth, 1)
    const height = Math.max(container.clientHeight, 1)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    composer.setSize(width, height)
  }

  function frameCamera(facing = 'left') {
    const aspect = Math.max(camera.aspect, 0.1)
    const verticalHalfFov = (camera.fov * Math.PI) / 360
    const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * aspect)
    const radius = (MODEL_SIZE * Math.sqrt(3)) / 2
    const distance = (radius / Math.min(Math.tan(verticalHalfFov), Math.tan(horizontalHalfFov))) * 1.25
    const cameraX = facing === 'right' ? -16 : 16
    const direction = new Vector3(cameraX, 11, 16).normalize()
    camera.position.copy(direction.multiplyScalar(distance))
    camera.near = Math.max(distance / 100, 0.01)
    camera.far = distance * 100
    camera.updateProjectionMatrix()
    controls.target.set(0, 0, 0)
    controls.update()
    controls.saveState()
  }

  function applyState(state) {
    currentPipeline = state.pipeline ?? (state.mode === 'unlit' ? 'unlit' : 'mr')
    scene.background = new Color(state.background)
    const legacy = currentPipeline === 'legacy'
    const neutral = currentPipeline === 'neutral'
    const twoDBiased = currentPipeline === 'twoD'
    hemisphere.color.setHex(legacy ? 0xcccccc : 0xffffff)
    hemisphere.groundColor.setHex(legacy ? 0x444444 : neutral ? 0x55585c : twoDBiased ? 0x33363a : 0x111111)
    hemisphere.intensity = state.lights.hemisphere
    key.position.set(1.5, 3, 2.5)
    key.color.setHex(0xffffff)
    key.intensity = state.lights.key
    fill.position.set(-1.5, -3, -2.5)
    fill.color.setHex(neutral ? 0xe2e5e8 : 0xffffff)
    fill.intensity = state.lights.fill
    bloomEnabled = state.bloom.enabled
    bloomPass.enabled = true
    bloomPass.strength = state.bloom.strength
    bloomPass.threshold = state.bloom.threshold
    bloomPass.radius = state.bloom.radius
    setRamp(state.ramp)
    setShadowColorRetention(state.shadowColorRetention)
    setMaterials(currentPipeline)
  }

  async function setObject(nextObject, id, { shouldFrame = true, facing = 'left' } = {}) {
    markVertexColors(nextObject)
    const frame = new Group()
    frame.name = `Rescue ${id}`
    frame.add(nextObject)
    const bounds = new Box3().setFromObject(frame)
    const center = bounds.getCenter(new Vector3())
    const size = bounds.getSize(new Vector3())
    const largestDimension = Math.max(size.x, size.y, size.z, 1)
    const scale = MODEL_SIZE / largestDimension
    frame.scale.setScalar(scale)
    frame.position.copy(center).multiplyScalar(-scale)

    if (currentObject) {
      modelRoot.remove(currentObject)
      disposeObject(currentObject, new Set([toonMaterial, legacyMaterial, neutralMaterial, unlitMaterial]))
    }
    currentObject = frame
    modelRoot.add(currentObject)
    if (shouldFrame) frameCamera(facing)
    setMaterials(currentPipeline)
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
    load: async (loaded, pose, facing = 'left') => {
      setMessage('Building VOX mesh…', 'loading')
      await setObject(loaded.getPose(pose), loaded.id, { facing })
      setMessage(`Loaded from ${loaded.source} · ${pose}`, 'success')
    },
    setPose: async (loaded, pose) => {
      await setObject(loaded.getPose(pose), loaded.id, { shouldFrame: false })
      setMessage(`Loaded from ${loaded.source} · ${pose}`, 'success')
    },
    error: (message) => setMessage(message, 'error'),
    destroy: () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', resize)
      renderer.setAnimationLoop(null)
      if (currentObject) disposeObject(currentObject, new Set([toonMaterial, legacyMaterial, neutralMaterial, unlitMaterial]))
      gradientMap.dispose()
      toonMaterial.dispose()
      legacyMaterial.dispose()
      neutralMaterial.dispose()
      unlitMaterial.dispose()
      composer.dispose()
      renderer.dispose()
    },
  }
}
