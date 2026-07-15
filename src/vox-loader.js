import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Mesh,
  MeshStandardMaterial,
} from 'three'

// MoonCat files include an RGBA chunk, but keep a harmless fallback for plain VOX files.
const DEFAULT_PALETTE = [0, ...Array(256).fill(0xffffff)]

function readString(data, cursor) {
  const length = data.getUint32(cursor, true)
  cursor += 4
  let value = ''
  for (let index = 0; index < length; index += 1) value += String.fromCharCode(data.getUint8(cursor + index))
  return { value, cursor: cursor + length }
}

function readDictionary(data, cursor) {
  const count = data.getUint32(cursor, true)
  cursor += 4
  const values = {}
  for (let index = 0; index < count; index += 1) {
    const key = readString(data, cursor)
    const value = readString(data, key.cursor)
    values[key.value] = value.value
    cursor = value.cursor
  }
  return { values, cursor }
}

function readFrame(data, cursor) {
  const dictionary = readDictionary(data, cursor)
  return { ...dictionary, frame: dictionary.values }
}

export class MoonCatVOXLoader {
  parse(buffer) {
    const data = new DataView(buffer)
    if (data.byteLength < 8 || data.getUint32(0, true) !== 542658390) {
      throw new Error('Invalid VOX file.')
    }

    const version = data.getUint32(4, true)
    if (version !== 150 && version !== 200) throw new Error(`Unsupported VOX version ${version}.`)

    const chunks = []
    const nodes = {}
    const layers = {}
    let palette = DEFAULT_PALETTE
    let cursor = 8

    while (cursor + 12 <= data.byteLength) {
      let id = ''
      for (let index = 0; index < 4; index += 1) id += String.fromCharCode(data.getUint8(cursor + index))
      cursor += 4
      const chunkSize = data.getUint32(cursor, true)
      cursor += 4
      cursor += 4 // child chunk count; child chunks are read by this loop.
      const chunkStart = cursor

      if (id === 'SIZE') {
        const size = {
          x: data.getUint32(cursor, true),
          y: data.getUint32(cursor + 4, true),
          z: data.getUint32(cursor + 8, true),
        }
        chunks.push({ size, palette: DEFAULT_PALETTE })
      } else if (id === 'XYZI') {
        const count = data.getUint32(cursor, true)
        const chunk = chunks[chunks.length - 1]
        if (!chunk) throw new Error('VOX XYZI chunk appeared before SIZE.')
        chunk.data = new Uint8Array(buffer, cursor + 4, count * 4)
      } else if (id === 'RGBA') {
        palette = [0]
        for (let index = 0; index < 256; index += 1) {
          palette.push(data.getUint32(cursor + index * 4, true))
        }
      } else if (id === 'nTRN') {
        const idValue = data.getUint32(cursor, true)
        cursor += 4
        const attributes = readDictionary(data, cursor)
        cursor = attributes.cursor
        const childNodeId = data.getInt32(cursor, true)
        cursor += 4
        const reservedId = data.getInt32(cursor, true)
        cursor += 4
        const layerId = data.getInt32(cursor, true)
        cursor += 4
        const frameCount = data.getUint32(cursor, true)
        cursor += 4
        const frames = []
        for (let index = 0; index < frameCount; index += 1) {
          const frame = readFrame(data, cursor)
          cursor = frame.cursor
          frames.push(frame.frame)
        }
        nodes[idValue] = { id: idValue, type: id, atts: attributes.values, childNodeId, reservedId, layerId, frames }
      } else if (id === 'nGRP') {
        const idValue = data.getUint32(cursor, true)
        cursor += 4
        const attributes = readDictionary(data, cursor)
        cursor = attributes.cursor
        const childCount = data.getUint32(cursor, true)
        cursor += 4
        const children = []
        for (let index = 0; index < childCount; index += 1) {
          children.push(data.getUint32(cursor, true))
          cursor += 4
        }
        nodes[idValue] = { id: idValue, type: id, atts: attributes.values, children }
      } else if (id === 'nSHP') {
        const idValue = data.getUint32(cursor, true)
        cursor += 4
        const attributes = readDictionary(data, cursor)
        cursor = attributes.cursor
        const modelCount = data.getUint32(cursor, true)
        cursor += 4
        const models = []
        for (let index = 0; index < modelCount; index += 1) {
          const modelId = data.getUint32(cursor, true)
          cursor += 4
          const modelAttributes = readDictionary(data, cursor)
          cursor = modelAttributes.cursor
          models.push({ id: modelId, attributes: modelAttributes.values })
        }
        nodes[idValue] = { id: idValue, type: id, atts: attributes.values, models }
      } else if (id === 'LAYR') {
        const layerId = data.getUint32(cursor, true)
        cursor += 4
        const attributes = readDictionary(data, cursor)
        cursor = attributes.cursor
        cursor += 4 // reserved id
        layers[layerId] = attributes.values
      }

      // Known chunks are parsed with their own cursor movement. This keeps unknown
      // extension chunks safe while honoring the chunk size for all other data.
      const expectedEnd = chunkStart + chunkSize
      if (cursor < expectedEnd) cursor = expectedEnd
    }

    for (const chunk of chunks) chunk.palette = palette
    return {
      chunks,
      scene: nodes[0] ? buildSceneNode(nodes[0], nodes, chunks, layers) : null,
    }
  }
}

function buildSceneNode(node, nodes, chunks, layers) {
  const parsed = { ...node }
  if (node.type === 'nTRN') {
    const child = nodes[node.childNodeId]
    if (!child) return parsed
    parsed.child = buildSceneNode(child, nodes, chunks, layers)
    parsed.name = layers[node.layerId]?._name ?? node.atts._name
    return parsed
  }
  if (node.type === 'nGRP') {
    parsed.children = node.children.map((childId) => buildSceneNode(nodes[childId], nodes, chunks, layers)).filter(Boolean)
    return parsed
  }
  if (node.type === 'nSHP') {
    parsed.models = node.models.map((model) => ({ ...model, chunk: chunks[model.id] }))
    return parsed
  }
  return parsed
}

export class MoonCatVOXMesh extends Mesh {
  constructor(chunk) {
    const data = chunk.data
    const size = chunk.size
    const palette = chunk.palette
    const vertices = []
    const colors = []
    const nx = [0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1]
    const px = [1, 0, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0]
    const py = [0, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1]
    const ny = [0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0]
    const nz = [0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0]
    const pz = [0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1]

    function add(tile, x, y, z, color) {
      const coordinate = [x - size.x / 2, y - size.z / 2, z + size.y / 2]
      for (let index = 0; index < 18; index += 3) {
        vertices.push(tile[index] + coordinate[0], tile[index + 1] + coordinate[1], tile[index + 2] + coordinate[2])
        colors.push(color.r, color.g, color.b)
      }
    }

    const offsetY = size.x
    const offsetZ = size.x * size.y
    const occupied = new Uint8Array(size.x * size.y * size.z)
    for (let index = 0; index < data.length; index += 4) {
      const x = data[index]
      const y = data[index + 1]
      const z = data[index + 2]
      occupied[x + y * offsetY + z * offsetZ] = 255
    }

    for (let index = 0; index < data.length; index += 4) {
      const x = data[index]
      const y = data[index + 1]
      const z = data[index + 2]
      const paletteValue = palette[data[index + 3]] ?? 0xffffff
      const color = new Color(
        (paletteValue & 0xff) / 0xff,
        ((paletteValue >> 8) & 0xff) / 0xff,
        ((paletteValue >> 16) & 0xff) / 0xff,
      ).convertSRGBToLinear()
      const position = x + y * offsetY + z * offsetZ

      if (occupied[position + 1] === 0 || x === size.x - 1) add(px, x, z, -y, color)
      if (occupied[position - 1] === 0 || x === 0) add(nx, x, z, -y, color)
      if (occupied[position + offsetY] === 0 || y === size.y - 1) add(ny, x, z, -y, color)
      if (occupied[position - offsetY] === 0 || y === 0) add(py, x, z, -y, color)
      if (occupied[position + offsetZ] === 0 || z === size.z - 1) add(pz, x, z, -y, color)
      if (occupied[position - offsetZ] === 0 || z === 0) add(nz, x, z, -y, color)
    }

    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
    geometry.computeVertexNormals()
    super(geometry, new MeshStandardMaterial({ vertexColors: true }))
  }
}
