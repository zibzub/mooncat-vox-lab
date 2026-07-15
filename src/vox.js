import { Group } from 'three'
import { VOXLoader, buildMesh } from 'three/addons/loaders/VOXLoader.js'

const POSE_NAMES = new Set(['posture', 'posture2', 'posture3', 'posture4'])

export async function loadVox(rescueId) {
  const id = String(rescueId).trim().replace(/[^a-zA-Z0-9_-]/g, '')
  if (!id) throw new Error('Enter a rescue ID before loading a model.')

  const url = `/vox/${encodeURIComponent(id)}.vox`
  const response = await fetch(url)
  const contentType = response.headers.get('content-type') || ''
  if (!response.ok || contentType.includes('text/html')) {
    throw new Error(`No bundled VOX file found for rescue ID ${id}. Expected public/vox/${id}.vox.`)
  }

  const result = new VOXLoader().parse(await response.arrayBuffer())
  if (!result?.chunks?.length) throw new Error(`The VOX file for rescue ID ${id} did not contain a model.`)
  return { id, object: selectDefaultPose(result) }
}

function selectDefaultPose(result) {
  if (result.scene) {
    let defaultPose = null
    result.scene.traverse((child) => {
      if (!defaultPose && POSE_NAMES.has(child.name?.toLowerCase())) {
        defaultPose = child
      }
    })

    if (defaultPose) {
      const pose = new Group()
      pose.name = defaultPose.name || 'Posture'
      pose.add(defaultPose.clone(true))
      return pose
    }

    return result.scene
  }

  return buildMesh(result.chunks[0])
}

/**
 * Three's VOXLoader converts palette bytes with Color.setRGB(..., SRGBColorSpace)
 * while building the vertex attribute. That is the single sRGB-to-linear
 * conversion used by this viewer; lit and unlit materials share the attribute.
 */
export function markVertexColors(object) {
  object.traverse((child) => {
    if (child.isMesh && child.geometry.getAttribute('color')) {
      child.geometry.getAttribute('color').needsUpdate = true
    }
  })
  return object
}
