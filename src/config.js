export const DEFAULTS = {
  id: '0',
  preset: 'issue176',
  pipeline: 'mr',
  mode: 'toon',
  ramp: {
    shadow: 75,
    midtone: 190,
    highlight: 255,
  },
  lights: {
    hemisphere: 0.5,
    key: 1.6,
    fill: 0.15,
  },
  background: '#202226',
  bloom: {
    enabled: false,
    strength: 0.8,
    threshold: 0.8,
    radius: 0.4,
  },
}

export const PRESETS = {
  issue176: {
    label: 'Issue #176 MR',
    state: DEFAULTS,
  },
  legacy: {
    label: 'ChainStation legacy',
    state: {
      ...DEFAULTS,
      preset: 'legacy',
      pipeline: 'legacy',
      lights: { hemisphere: 2.5, key: 1.25, fill: 0.5 },
      background: '#111111',
    },
  },
  unlit: {
    label: 'Unlit palette',
    state: {
      ...DEFAULTS,
      preset: 'unlit',
      pipeline: 'unlit',
      mode: 'unlit',
    },
  },
  highContrast: {
    label: 'High contrast',
    state: {
      ...DEFAULTS,
      pipeline: 'mr',
      ramp: { shadow: 24, midtone: 155, highlight: 255 },
      lights: { hemisphere: 0.35, key: 3.2, fill: 0.1 },
      background: '#080a0f',
    },
  },
  softLighting: {
    label: 'Soft lighting',
    state: {
      ...DEFAULTS,
      pipeline: 'mr',
      ramp: { shadow: 92, midtone: 182, highlight: 242 },
      lights: { hemisphere: 1.35, key: 1.15, fill: 0.8 },
      background: '#232831',
    },
  },
}

export function cloneState(state = DEFAULTS) {
  return {
    ...state,
    ramp: { ...state.ramp },
    lights: { ...state.lights },
    bloom: { ...state.bloom },
  }
}

export function presetState(name, id = DEFAULTS.id) {
  const preset = PRESETS[name] ?? PRESETS.issue176
  const state = cloneState(preset.state)
  state.id = id
  state.preset = name
  return state
}

export function matchingPreset(state) {
  const keys = Object.keys(PRESETS)
  return keys.find((key) => {
    const candidate = PRESETS[key].state
    return state.pipeline === candidate.pipeline
      && state.mode === candidate.mode
      && state.background === candidate.background
      && JSON.stringify(state.ramp) === JSON.stringify(candidate.ramp)
      && JSON.stringify(state.lights) === JSON.stringify(candidate.lights)
      && JSON.stringify(state.bloom) === JSON.stringify(candidate.bloom)
  }) ?? 'custom'
}
