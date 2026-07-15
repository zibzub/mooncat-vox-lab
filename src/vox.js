import { MoonCatVOXLoader, MoonCatVOXMesh } from './vox-loader.js'

export async function loadVox(rescueId) {
  const id = String(rescueId).trim().replace(/[^a-zA-Z0-9_-]/g, '')
  if (!id) throw new Error('Enter a rescue ID before loading a model.')

  const url = `/vox/${encodeURIComponent(id)}.vox`
  const response = await fetch(url)
  const contentType = response.headers.get('content-type') || ''
  if (!response.ok || contentType.includes('text/html')) {
    throw new Error(`No bundled VOX file found for rescue ID ${id}. Expected public/vox/${id}.vox.`)
  }

  const result = new MoonCatVOXLoader().parse(await response.arrayBuffer())
  if (!result?.chunks?.length) throw new Error(`The VOX file for rescue ID ${id} did not contain a model.`)
  return { id, object: selectStandingPose(result) }
}

function selectStandingPose(result) {
  const layers = result.scene?.child?.children ?? []
  const targetLayer = layers.find((layer) => layer.name === 'Posture')
  const fallbackChunk = result.chunks[0]
  const chunk = targetLayer?.child?.models?.[0]?.chunk ?? fallbackChunk
  const paletteSource = layers[0]?.child?.models?.[0]?.chunk?.palette
  if (paletteSource && chunk) chunk.palette = paletteSource
  if (!chunk?.data) throw new Error('The VOX file did not contain a usable standing Posture layer.')

  const mesh = new MoonCatVOXMesh(chunk)
  mesh.name = targetLayer?.name ?? 'Posture'
  if (targetLayer?.frames?.[0]?._r) mesh.scale.x *= -1
  return mesh
}

/**
 * MoonCatVOXMesh converts palette bytes from sRGB to linear while building the
 * vertex attribute. That is the single conversion used by this viewer; lit and
 * unlit materials share the attribute.
 */
export function markVertexColors(object) {
  object.traverse((child) => {
    if (child.isMesh && child.geometry.getAttribute('color')) {
      child.geometry.getAttribute('color').needsUpdate = true
    }
  })
  return object
}
