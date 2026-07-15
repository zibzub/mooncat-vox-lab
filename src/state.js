import { DEFAULTS, cloneState } from './config.js'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

function number(value, fallback, min, max) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? clamp(parsed, min, max) : fallback
}

function ramp(value, fallback) {
  const values = String(value ?? '').split(',').map(Number)
  return values.length === 3 && values.every(Number.isFinite)
    ? {
        shadow: number(values[0], fallback.shadow, 0, 255),
        midtone: number(values[1], fallback.midtone, 0, 255),
        highlight: number(values[2], fallback.highlight, 0, 255),
      }
    : { ...fallback }
}

function lights(value, fallback) {
  const values = String(value ?? '').split(',').map(Number)
  return values.length === 3 && values.every(Number.isFinite)
    ? {
        hemisphere: number(values[0], fallback.hemisphere, 0, 4),
        key: number(values[1], fallback.key, 0, 6),
        fill: number(values[2], fallback.fill, 0, 4),
      }
    : { ...fallback }
}

function bloom(value, fallback) {
  const values = String(value ?? '').split(',').map(Number)
  return values.length === 4 && values.every(Number.isFinite)
    ? {
        enabled: values[0] === 1,
        strength: number(values[1], fallback.strength, 0, 3),
        threshold: number(values[2], fallback.threshold, 0, 2),
        radius: number(values[3], fallback.radius, 0, 1),
      }
    : { ...fallback }
}

export function stateFromUrl(search = window.location.search) {
  const params = new URLSearchParams(search)
  const state = cloneState(DEFAULTS)
  state.id = (params.get('id') || DEFAULTS.id).trim().replace(/[^a-zA-Z0-9_-]/g, '') || DEFAULTS.id
  state.mode = params.get('mode') === 'unlit' ? 'unlit' : DEFAULTS.mode
  state.ramp = ramp(params.get('ramp'), state.ramp)
  state.lights = lights(params.get('lights'), state.lights)
  const background = params.get('bg')
  if (background && /^#[0-9a-f]{6}$/i.test(background)) state.background = background
  state.bloom = bloom(params.get('bloom'), state.bloom)
  return state
}

export function urlForState(state, location = window.location) {
  const params = new URLSearchParams()
  params.set('id', state.id)
  params.set('mode', state.mode)
  params.set('ramp', [state.ramp.shadow, state.ramp.midtone, state.ramp.highlight].join(','))
  params.set('lights', [state.lights.hemisphere, state.lights.key, state.lights.fill].join(','))
  params.set('bg', state.background)
  params.set('bloom', [state.bloom.enabled ? 1 : 0, state.bloom.strength, state.bloom.threshold, state.bloom.radius].join(','))
  return `${location.origin}${location.pathname}?${params.toString()}`
}

export function persistState(state) {
  const url = urlForState(state)
  window.history.replaceState({}, '', `${url}${window.location.hash}`)
  return url
}
