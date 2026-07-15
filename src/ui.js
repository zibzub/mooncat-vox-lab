import { LIGHTING_PRESETS, PRESETS, matchingLightingPreset } from './config.js'

function range(id, label, min, max, step, value, suffix = '') {
  return `<label class="range-control" for="${id}">
    <span><span>${label}</span><output data-output="${id}">${value}${suffix}</output></span>
    <input id="${id}" data-setting="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}">
  </label>`
}

export function renderShell(root) {
  root.innerHTML = `
    <header class="topbar">
      <div class="brand-lockup">
        <div><strong>MoonCat VOX Lab</strong><span>renderer tuning bench</span></div>
      </div>
      <div class="header-note">Three.js · issue #176</div>
    </header>
    <main class="workspace">
      <section class="viewer-card" aria-label="VOX preview">
        <div class="viewer-toolbar">
          <div><span class="eyebrow">Live preview</span><span id="model-status" class="status-pill">Waiting for a VOX file</span></div>
          <span class="drag-hint">Drag to orbit · scroll to zoom</span>
        </div>
        <div id="viewer" class="viewer-stage">
          <div id="viewer-message" class="viewer-message">
            <div class="message-icon">◇</div>
            <strong id="viewer-message-title">No sample loaded</strong>
            <p id="viewer-message-detail">Add a file at <code>public/vox/&lt;rescue-id&gt;.vox</code>, then load that ID.</p>
          </div>
          <div class="reference-overlay" aria-live="polite">
            <span class="reference-overlay-label">OG 2D</span>
            <span id="reference-status">Waiting</span>
            <img id="reference-image" alt="" hidden>
            <span id="reference-placeholder">Load a rescue to compare the original 2D MoonCat.</span>
          </div>
        </div>
        <div class="viewer-footer"><span>Vertex colors: sRGB → linear once at VOX decode</span><span id="render-mode-label">TOON LIT</span></div>
      </section>
      <aside class="control-panel" aria-label="Viewer controls">
        <section class="control-section model-section">
          <div class="section-heading"><span class="section-number">01</span><h2>Model</h2></div>
          <form id="model-form" class="model-form">
            <label for="rescue-id">Rescue ID</label>
            <div class="input-row"><input id="rescue-id" name="id" inputmode="numeric" autocomplete="off" placeholder="e.g. 1234"><button type="submit" class="button button-primary">Load</button></div>
          </form>
          <p id="load-status" class="helper-text">Expected path: <code>public/vox/&lt;id&gt;.vox</code></p>
          <label class="field-label pose-label" for="pose-select">Pose</label>
          <select id="pose-select" class="select-control" disabled><option>Load a model first</option></select>
        </section>
        <section class="control-section">
          <div class="section-heading"><span class="section-number">02</span><h2>Look</h2></div>
          <label class="field-label" for="preset">Preset</label>
          <select id="preset" class="select-control">
            ${Object.entries(PRESETS).map(([key, preset]) => `<option value="${key}">${preset.label}</option>`).join('')}
            <option value="custom">Custom</option>
          </select>
          <div class="mode-switch" role="group" aria-label="Material mode">
            <button type="button" data-mode="toon" class="mode-button active">Toon lit</button>
            <button type="button" data-mode="unlit" class="mode-button">Unlit palette</button>
          </div>
          <div class="subheading">Toon ramp</div>
          ${range('ramp.shadow', 'Shadow', 0, 255, 1, 75)}
          ${range('ramp.midtone', 'Midtone', 0, 255, 1, 190)}
          ${range('ramp.highlight', 'Highlight', 0, 255, 1, 255)}
          ${range('shadowColorRetention', 'Shadow color retention', 0, 1, 0.01, 0)}
          <label class="color-control" for="background"><span>Background</span><input id="background" data-setting="background" type="color" value="#202226"></label>
        </section>
        <section class="control-section">
          <div class="section-heading"><span class="section-number">03</span><h2>Lighting</h2></div>
          <div class="lighting-presets" role="radiogroup" aria-label="Lighting preset">
            ${Object.entries(LIGHTING_PRESETS).map(([key, preset]) => `<label><input type="radio" name="lighting-preset" value="${key}"><span>${preset.label}</span></label>`).join('')}
          </div>
          ${range('lights.hemisphere', 'Hemisphere', 0, 4, 0.05, 0.5)}
          ${range('lights.key', 'Key light', 0, 6, 0.05, 1.6)}
          ${range('lights.fill', 'Fill light', 0, 4, 0.05, 0.15)}
        </section>
        <section class="control-section bloom-section">
          <div class="section-heading"><span class="section-number">04</span><h2>Bloom</h2><span id="bloom-state" class="toggle-state">Off</span><label class="switch"><input id="bloom.enabled" data-setting="bloom.enabled" type="checkbox"><span></span></label></div>
          <div id="bloom-controls" class="bloom-controls is-disabled">
            ${range('bloom.strength', 'Strength', 0, 3, 0.05, 0.8)}
            ${range('bloom.threshold', 'Threshold', 0, 2, 0.05, 0.8)}
            ${range('bloom.radius', 'Radius', 0, 1, 0.05, 0.4)}
          </div>
          <p class="helper-text">Optional UnrealBloomPass · off by default</p>
        </section>
        <div class="panel-actions"><button id="reset" type="button" class="button button-secondary">Reset defaults</button><button id="copy-link" type="button" class="button button-secondary">Copy share link</button></div>
      </aside>
    </main>
    <footer class="page-footer"><span>Standalone community test site for VOX renderer changes.</span><span id="copy-status" aria-live="polite"></span></footer>
  `
}

function setValue(root, id, value) {
  const input = root.querySelector(`[data-setting="${id}"]`)
  if (!input) return
  if (input.type === 'checkbox') input.checked = Boolean(value)
  else input.value = value
  const output = root.querySelector(`[data-output="${id}"]`)
  if (output) output.textContent = `${value}${id.startsWith('lights.') || id.startsWith('bloom.') ? '' : ''}`
}

export function syncControls(root, state) {
  root.querySelector('#rescue-id').value = state.id
  root.querySelector('#preset').value = state.preset ?? 'custom'
  setValue(root, 'ramp.shadow', state.ramp.shadow)
  setValue(root, 'ramp.midtone', state.ramp.midtone)
  setValue(root, 'ramp.highlight', state.ramp.highlight)
  setValue(root, 'shadowColorRetention', state.shadowColorRetention)
  setValue(root, 'lights.hemisphere', state.lights.hemisphere)
  setValue(root, 'lights.key', state.lights.key)
  setValue(root, 'lights.fill', state.lights.fill)
  const lightingPreset = matchingLightingPreset(state.lights)
  root.querySelectorAll('input[name="lighting-preset"]').forEach((input) => {
    input.checked = input.value === lightingPreset
  })
  setValue(root, 'background', state.background)
  setValue(root, 'bloom.enabled', state.bloom.enabled)
  setValue(root, 'bloom.strength', state.bloom.strength)
  setValue(root, 'bloom.threshold', state.bloom.threshold)
  setValue(root, 'bloom.radius', state.bloom.radius)
  root.querySelectorAll('[data-mode]').forEach((button) => button.classList.toggle('active', button.dataset.mode === state.mode))
  root.querySelector('#render-mode-label').textContent = state.pipeline === 'legacy'
    ? 'LEGACY STANDARD'
    : state.pipeline === 'neutral'
      ? 'NEUTRAL GAME'
      : state.pipeline === 'twoD'
        ? '2D-BIASED TOON'
        : state.pipeline === 'unlit' ? 'PALETTE REFERENCE' : 'TOON LIT'
  root.querySelector('#bloom-controls').classList.toggle('is-disabled', !state.bloom.enabled)
  root.querySelector('#bloom-state').textContent = state.bloom.enabled ? 'Enabled' : 'Off'
  root.querySelector('#bloom-state').classList.toggle('is-enabled', state.bloom.enabled)
}

export function updateReferenceImage(root, id) {
  const image = root.querySelector('#reference-image')
  const placeholder = root.querySelector('#reference-placeholder')
  const status = root.querySelector('#reference-status')
  const requestId = String(id)
  image.dataset.requestId = requestId
  image.alt = `Original 2D MoonCat rescue ${requestId}`
  image.hidden = true
  placeholder.hidden = false
  placeholder.textContent = `Loading rescue ${requestId}…`
  status.textContent = 'Loading'
  image.onload = () => {
    if (image.dataset.requestId !== requestId) return
    image.hidden = false
    placeholder.hidden = true
    status.textContent = 'Available'
  }
  image.onerror = () => {
    if (image.dataset.requestId !== requestId) return
    image.hidden = true
    placeholder.hidden = false
    placeholder.textContent = '2D reference unavailable'
    status.textContent = 'Unavailable'
  }
  image.src = `https://api.mooncatrescue.com/mooncat/image/${encodeURIComponent(requestId)}.png?costumes=false&acc=&glow=0&scale=3`
}

export function setPoseOptions(root, poses, selectedPose) {
  const select = root.querySelector('#pose-select')
  select.replaceChildren()
  if (!poses.length) {
    const option = new Option('No named pose layers', '')
    option.disabled = true
    select.add(option)
    select.disabled = true
    return selectedPose
  }
  poses.forEach((pose) => select.add(new Option(pose.label, pose.name)))
  select.disabled = false
  const selected = poses.some((pose) => pose.name === selectedPose) ? selectedPose : poses[0].name
  select.value = selected
  return selected
}

export function bindControls(root, handlers) {
  root.querySelector('#model-form').addEventListener('submit', (event) => {
    event.preventDefault()
    handlers.load(root.querySelector('#rescue-id').value)
  })
  root.querySelectorAll('[data-setting]').forEach((input) => {
    input.addEventListener('input', () => handlers.change(input.dataset.setting, input.type === 'checkbox' ? input.checked : input.value))
  })
  root.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => handlers.mode(button.dataset.mode)))
  root.querySelector('#preset').addEventListener('change', (event) => handlers.preset(event.target.value))
  root.querySelectorAll('input[name="lighting-preset"]').forEach((input) => {
    input.addEventListener('change', () => {
      if (input.checked) handlers.lighting(input.value)
    })
  })
  root.querySelector('#pose-select').addEventListener('change', (event) => handlers.pose(event.target.value))
  root.querySelector('#reset').addEventListener('click', handlers.reset)
  root.querySelector('#copy-link').addEventListener('click', handlers.copy)
}

export function setLoadStatus(root, message, kind = '') {
  const status = root.querySelector('#load-status')
  status.textContent = message
  status.className = `helper-text ${kind}`
  const pill = root.querySelector('#model-status')
  pill.textContent = kind === 'error' ? 'Load error' : message
  pill.className = `status-pill ${kind}`
  root.querySelector('#viewer-message-title').textContent = kind === 'error' ? 'Could not load this model' : message
  root.querySelector('#viewer-message-detail').textContent = kind === 'error' ? message : 'Add a sample VOX file to public/vox, then load its rescue ID.'
  root.querySelector('#viewer-message').classList.toggle('is-hidden', kind === 'success')
}
