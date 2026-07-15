import './style.css'
import { cloneState, presetState } from './config.js'
import { persistState, stateFromUrl, urlForState } from './state.js'
import { loadVox } from './vox.js'
import { createViewer } from './viewer.js'
import { bindControls, renderShell, setLoadStatus, syncControls } from './ui.js'

const root = document.querySelector('#app')
renderShell(root)

let state = stateFromUrl()
let viewer

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

async function loadSelected(id, { showMissing = true, manual = false } = {}) {
  const cleanedId = String(id).trim().replace(/[^a-zA-Z0-9_-]/g, '')
  state.id = cleanedId || state.id
  if (manual) state.preset = 'custom'
  persistState(state)
  syncControls(root, state)
  setLoadStatus(root, `Loading rescue ${state.id}…`, 'loading')
  try {
    const loaded = await loadVox(state.id)
    viewer.applyState(state)
    await viewer.load(loaded)
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
  load: (id) => loadSelected(id, { manual: true }),
  change: patchSetting,
  mode: (mode) => updateState({ ...state, mode, preset: 'custom' }),
  preset: (name) => updateState(name === 'custom' ? { ...state, preset: 'custom' } : presetState(name, state.id)),
  reset: () => updateState(presetState('issue176', state.id)),
  copy: copyShareLink,
  customize: () => {
    if (state.preset !== 'custom') updateState({ ...state, preset: 'custom' }, { persist: false })
  },
})

loadSelected(state.id)
