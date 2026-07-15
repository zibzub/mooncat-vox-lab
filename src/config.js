export const DEFAULTS = {
  id: '0',
  preset: 'issue176',
  pipeline: 'mr',
  mode: 'toon',
  pose: 'Posture',
  shadowColorRetention: 0,
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
    label: 'Palette reference — unlit',
    state: {
      ...DEFAULTS,
      preset: 'unlit',
      pipeline: 'unlit',
      mode: 'unlit',
    },
  },
  neutralGame: {
    label: 'Neutral game lighting',
    state: {
      ...DEFAULTS,
      preset: 'neutralGame',
      pipeline: 'neutral',
      lights: { hemisphere: 1.2, key: 0.95, fill: 0.45 },
      background: '#24272b',
    },
  },
  twoDBiased: {
    label: '2D-biased',
    state: {
      ...DEFAULTS,
      preset: 'twoDBiased',
      pipeline: 'twoD',
      shadowColorRetention: 0.12,
      ramp: { shadow: 135, midtone: 225, highlight: 255 },
      lights: { hemisphere: 1.1, key: 0.85, fill: 0.4 },
      background: '#24272b',
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

export function presetState(name, id = DEFAULTS.id, pose = DEFAULTS.pose) {
  const preset = PRESETS[name] ?? PRESETS.issue176
  const state = cloneState(preset.state)
  state.id = id
  state.pose = pose
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
      && state.shadowColorRetention === (candidate.shadowColorRetention ?? 0)
      && JSON.stringify(state.ramp) === JSON.stringify(candidate.ramp)
      && JSON.stringify(state.lights) === JSON.stringify(candidate.lights)
      && JSON.stringify(state.bloom) === JSON.stringify(candidate.bloom)
  }) ?? 'custom'
}
