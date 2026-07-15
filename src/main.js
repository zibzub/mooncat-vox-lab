import './style.css'
import rightFacingRescues from './right-facing-rescues.json'
import rescuePoses from './rescue-poses.json'
import { cloneState, presetState } from './config.js'
import { persistState, stateFromUrl, urlForState } from './state.js'
import { loadVox } from './vox.js'
import { createViewer } from './viewer.js'
import { bindControls, renderShell, setLoadStatus, setPoseOptions, syncControls, updateReferenceImage } from './ui.js'

const root = document.querySelector('#app')
renderShell(root)

let state = stateFromUrl()
let viewer
let loadedAsset = null
const rightFacingRescueIds = new Set(rightFacingRescues.map(String))
const poseNames = {
  standing: 'Posture',
  sleeping: 'Posture2',
  pouncing: 'Posture3',
  stalking: 'Posture4',
}
const initialUrlHasPose = new URLSearchParams(window.location.search).has('pose')

function updateState(nextState, { persist = true } = {}) {
  state = nextState
  if (persist) persistState(state)
  syncControls(root, state)
  viewer?.applyState(state)
}

function patchSetting(path, rawValue) {
  const next = cloneState(state)
  const [group, key] = path.split('.')
  if (key) next[group][key] = group === 'bloom' && key === 'enabled' ? Boolean(rawValue) : Number(rawValue)
  else next[path] = rawValue
  next.preset = 'custom'
  updateState(next)
}

async function loadSelected(id, { showMissing = true, preservePose = false } = {}) {
  const cleanedId = String(id).trim().replace(/[^a-zA-Z0-9_-]/g, '')
  state.id = cleanedId || state.id
  loadedAsset = null
  setPoseOptions(root, [], state.pose)
  persistState(state)
  syncControls(root, state)
  updateReferenceImage(root, state.id)
  setLoadStatus(root, `Loading rescue ${state.id}…`, 'loading')
  try {
    const loaded = await loadVox(state.id)
    loadedAsset = loaded
    const traitPose = poseNames[rescuePoses[String(state.id)]]
    const preferredPose = preservePose ? state.pose : traitPose || state.pose || loaded.defaultPose
    const selectedPose = setPoseOptions(root, loaded.poses, preferredPose)
    state.pose = selectedPose || loaded.defaultPose
    persistState(state)
    syncControls(root, state)
    viewer.applyState(state)
    await viewer.load(loaded, state.pose, rightFacingRescueIds.has(String(state.id)) ? 'right' : 'left')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load the VOX file.'
    if (showMissing) viewer.error(message)
    setLoadStatus(root, message, 'error')
  }
}

function copyShareLink() {
  const url = urlForState(state)
  const done = () => {
    const status = root.querySelector('#copy-status')
    status.textContent = 'Share link copied'
    window.setTimeout(() => { status.textContent = '' }, 2200)
  }
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(done).catch(() => window.prompt('Copy this share link:', url))
  else window.prompt('Copy this share link:', url)
}

viewer = createViewer(root.querySelector('#viewer'), (message, kind) => setLoadStatus(root, message, kind))
syncControls(root, state)
viewer.applyState(state)
bindControls(root, {
  load: (id) => loadSelected(id),
  change: patchSetting,
  mode: (mode) => updateState({
    ...state,
    mode,
    pipeline: mode === 'unlit' ? 'unlit' : 'mr',
    preset: 'custom',
  }),
  preset: (name) => updateState(name === 'custom' ? { ...state, preset: 'custom' } : presetState(name, state.id, state.pose)),
  reset: () => updateState(presetState('issue176', state.id, state.pose)),
  copy: copyShareLink,
  pose: async (pose) => {
    if (!loadedAsset) return
    state.pose = pose
    persistState(state)
    syncControls(root, state)
    try {
      await viewer.setPose(loadedAsset, state.pose)
    } catch (error) {
      setLoadStatus(root, error instanceof Error ? error.message : 'Unable to switch pose.', 'error')
    }
  },
  customize: () => {
    if (state.preset !== 'custom') updateState({ ...state, preset: 'custom' }, { persist: false })
  },
})

loadSelected(state.id, { preservePose: initialUrlHasPose })
