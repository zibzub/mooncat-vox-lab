import { MoonCatVOXLoader, MoonCatVOXMesh } from './vox-loader.js'

export const MOONCAT_CID = 'bafybeifxqtzf635xy3q3lrp2cygrz2vatregvtnfe2dsl4jskjyuneexzu'
const IPFS_GATEWAYS = [
  { label: 'IPFS dweb.link', url: (id) => `https://${MOONCAT_CID}.ipfs.dweb.link/${encodeURIComponent(id)}.vox` },
  { label: 'IPFS ipfs.io', url: (id) => `https://ipfs.io/ipfs/${MOONCAT_CID}/${encodeURIComponent(id)}.vox` },
  { label: 'IPFS 4everland', url: (id) => `https://${MOONCAT_CID}.ipfs.4everland.io/${encodeURIComponent(id)}.vox` },
  { label: 'IPFS Pinata', url: (id) => `https://gateway.pinata.cloud/ipfs/${MOONCAT_CID}/${encodeURIComponent(id)}.vox` },
  { label: 'IPFS MyFilebase', url: (id) => `https://mooncats.myfilebase.com/ipfs/${MOONCAT_CID}/${encodeURIComponent(id)}.vox` },
]

const POSE_LABELS = {
  Posture: 'Standing',
  Posture2: 'Sleeping',
  Posture3: 'Pouncing',
  Posture4: 'Stalking',
}

export async function loadVox(rescueId) {
  const id = String(rescueId).trim().replace(/[^a-zA-Z0-9_-]/g, '')
  if (!id) throw new Error('Enter a rescue ID before loading a model.')

  const sources = [
    { label: 'local', url: `/vox/${encodeURIComponent(id)}.vox` },
    ...IPFS_GATEWAYS.map((gateway) => ({ label: gateway.label, url: gateway.url(id) })),
  ]
  const failures = []
  for (const source of sources) {
    try {
      const buffer = await fetchVoxBuffer(source.url)
      const result = new MoonCatVOXLoader().parse(buffer)
      if (!result?.chunks?.length) throw new Error('The VOX file did not contain a model.')
      return { id, source: source.label, ...createPoseAsset(result) }
    } catch (error) {
      failures.push(`${source.label}: ${error instanceof Error ? error.message : 'unavailable'}`)
    }
  }

  throw new Error(`Could not load rescue ${id} locally or from the IPFS gateways.`)
}

async function fetchVoxBuffer(url) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 5000)
  try {
    const response = await fetch(url, { signal: controller.signal })
    const contentType = response.headers.get('content-type') || ''
    if (!response.ok || contentType.includes('text/html')) throw new Error(`HTTP ${response.status}`)
    const buffer = await response.arrayBuffer()
    const header = new TextDecoder().decode(new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength)))
    if (header !== 'VOX ') throw new Error('not a VOX response')
    return buffer
  } finally {
    window.clearTimeout(timeout)
  }
}

function createPoseAsset(result) {
  const layers = result.scene?.child?.children ?? []
  const paletteSource = layers[0]?.child?.models?.[0]?.chunk?.palette
  const poses = layers
    .filter((layer) => Object.hasOwn(POSE_LABELS, layer.name))
    .map((layer) => ({
      name: layer.name,
      label: POSE_LABELS[layer.name],
      chunk: layer.child?.models?.[0]?.chunk,
      mirrored: Boolean(layer.frames?.[0]?._r),
    }))
    .filter((pose) => pose.chunk?.data)

  const fallback = result.chunks[0]
  if (!fallback?.data && poses.length === 0) throw new Error('The VOX file did not contain a usable model.')

  return {
    poses,
    defaultPose: poses.find((pose) => pose.name === 'Posture')?.name ?? poses[0]?.name ?? 'Posture',
    getPose(poseName) {
      const pose = poses.find((candidate) => candidate.name === poseName) ?? poses[0]
      const chunk = pose?.chunk ?? fallback
      if (!chunk?.data) throw new Error('The selected VOX pose is unavailable.')
      if (paletteSource) chunk.palette = paletteSource
      const mesh = new MoonCatVOXMesh(chunk)
      mesh.name = pose?.name ?? 'Posture'
      if (pose?.mirrored) mesh.scale.x *= -1
      return mesh
    },
  }
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
