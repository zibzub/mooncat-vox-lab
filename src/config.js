export const DEFAULTS = {
  id: '0',
  mode: 'toon',
  ramp: {
    shadow: 75,
    midtone: 190,
    highlight: 255,
  },
  lights: {
    hemisphere: 0.8,
    key: 2.2,
    fill: 0.35,
  },
  background: '#15191f',
  bloom: {
    enabled: false,
    strength: 0.8,
    threshold: 0.8,
    radius: 0.4,
  },
}

export const PRESETS = {
  issue176: {
    label: 'Current issue #176',
    state: DEFAULTS,
  },
  unlit: {
    label: 'Unlit palette',
    state: {
      ...DEFAULTS,
      mode: 'unlit',
    },
  },
  highContrast: {
    label: 'High contrast',
    state: {
      ...DEFAULTS,
      ramp: { shadow: 24, midtone: 155, highlight: 255 },
      lights: { hemisphere: 0.35, key: 3.2, fill: 0.1 },
      background: '#080a0f',
    },
  },
  softLighting: {
    label: 'Soft lighting',
    state: {
      ...DEFAULTS,
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
  return state
}
