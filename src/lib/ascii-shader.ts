import type { CardAnimation } from '../config/app'

export type ShaderCard = {
  x: number
  y: number
  width: number
  height: number
  animation: CardAnimation
  seed: number
  imageUrl?: string
  opacity?: number
  borderRadius?: number
  effect?: number
}

export type ShaderTrailPoint = {
  x: number
  y: number
  strength: number
  age: number
}

export type AsciiShaderRenderer = {
  render: (
    cards: Array<ShaderCard>,
    timeSeconds: number,
    viewportWidth: number,
    viewportHeight: number,
    trailPoints: Array<ShaderTrailPoint>,
  ) => void
  dispose: () => void
}

const VERTEX_SHADER = `#version 300 es
precision highp float;

void main() {
  vec2 position = vec2(
    gl_VertexID == 1 ? 3.0 : -1.0,
    gl_VertexID == 2 ? 3.0 : -1.0
  );
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
precision highp int;

uniform vec4 u_rect;
uniform float u_dpr;
uniform float u_opacity;
uniform float u_radius;
uniform float u_effect;
uniform float u_viewport_height;
uniform sampler2D u_image;
uniform vec2 u_image_size;
uniform int u_has_image;
uniform int u_trail_count;
uniform vec4 u_trail_points[8];

out vec4 outColor;

int glyphRow(int glyph, int row) {
  if (glyph == 1) {
    return row == 3 ? 31 : 0;
  }
  if (glyph == 2) {
    if (row == 1 || row == 5) return 16;
    if (row == 2 || row == 4) return 12;
    return row == 3 ? 3 : 0;
  }
  if (glyph == 3) {
    if (row == 1 || row == 5) return 14;
    return row > 1 && row < 5 ? 17 : 0;
  }
  return 0;
}

float glyphPixel(int glyph, vec2 position) {
  ivec2 pixel = ivec2(floor(mod(position, vec2(6.0, 8.0))));
  if (pixel.x >= 5 || pixel.y >= 7) return 0.0;
  int bits = glyphRow(glyph, 6 - pixel.y);
  return float((bits >> (4 - pixel.x)) & 1);
}

float sampledGlyph(int glyph, vec2 position) {
  vec2 base = floor(position);
  vec2 blend = smoothstep(vec2(0.0), vec2(1.0), fract(position));
  float lower = mix(
    glyphPixel(glyph, base),
    glyphPixel(glyph, base + vec2(1.0, 0.0)),
    blend.x
  );
  float upper = mix(
    glyphPixel(glyph, base + vec2(0.0, 1.0)),
    glyphPixel(glyph, base + vec2(1.0, 1.0)),
    blend.x
  );
  return mix(lower, upper, blend.y);
}

vec2 coverUv(vec2 uv, vec2 cardSize) {
  float cardAspect = cardSize.x / max(cardSize.y, 1.0);
  float imageAspect = u_image_size.x / max(u_image_size.y, 1.0);
  if (imageAspect > cardAspect) {
    float visibleWidth = cardAspect / imageAspect;
    uv.x = (uv.x - 0.5) * visibleWidth + 0.5;
  } else {
    float visibleHeight = imageAspect / cardAspect;
    uv.y = (uv.y - 0.5) * visibleHeight + 0.5;
  }
  return clamp(uv, vec2(0.0), vec2(1.0));
}

float mediaLuminance(vec2 logical, vec2 logicalSize) {
  if (u_has_image == 0) return 0.5;
  vec2 cellCenter = (
    floor(logical / vec2(6.0, 8.0)) * vec2(6.0, 8.0) +
    vec2(3.0, 4.0)
  ) / max(logicalSize, vec2(1.0));
  vec3 media = texture(u_image, coverUv(cellCenter, logicalSize)).rgb;
  return dot(media, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
  vec2 localDevice = gl_FragCoord.xy - u_rect.xy;
  vec2 logicalSize = u_rect.zw / u_dpr;
  vec2 logical = localDevice / u_dpr;
  vec2 roundedDelta = abs(logical - logicalSize * 0.5) -
    logicalSize * 0.5 + vec2(u_radius);
  float roundedDistance = length(max(roundedDelta, vec2(0.0))) +
    min(max(roundedDelta.x, roundedDelta.y), 0.0) - u_radius;
  float edgeCoverage = 1.0 - smoothstep(-0.75, 0.75, roundedDistance);
  if (edgeCoverage <= 0.0) discard;

  vec2 screenLogical = vec2(
    gl_FragCoord.x / u_dpr,
    u_viewport_height - gl_FragCoord.y / u_dpr
  );
  float trailMask = 0.0;
  for (int index = 0; index < 8; index += 1) {
    if (index >= u_trail_count) break;
    vec4 point = u_trail_points[index];
    vec2 delta = screenLogical - point.xy;
    vec2 contact = delta / vec2(66.0, 54.0);
    float life = clamp(1.0 - point.w, 0.0, 1.0);
    float reveal = exp(-dot(contact, contact) * 2.4) * point.z * life;
    trailMask = max(trailMask, reveal);
  }

  float effectMask = smoothstep(
    0.025,
    0.68,
    clamp(max(trailMask, u_effect), 0.0, 1.0)
  );
  if (effectMask <= 0.001) discard;

  float luminance = mediaLuminance(logical, logicalSize);
  int glyph = luminance > 0.72 ? 3 : (luminance > 0.34 ? 2 : 1);
  float character = sampledGlyph(glyph, logical - vec2(0.5));
  float density = mix(0.58, 1.0, luminance);
  float characterAlpha =
    character * density * u_opacity * edgeCoverage * effectMask;
  if (characterAlpha <= 0.001) discard;
  outColor = vec4(vec3(1.0), characterAlpha);
}
`

const MAX_TRAIL_POINTS = 8

type TextureEntry = {
  texture: WebGLTexture
  width: number
  height: number
  ready: boolean
}

export function createAsciiShaderRenderer(
  canvas: HTMLCanvasElement,
  maxDevicePixelRatio: number,
): AsciiShaderRenderer | null {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: false,
    depth: false,
    desynchronized: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
  })

  if (!gl) {
    canvas.dataset.renderer = 'unavailable'
    return null
  }

  let resources = createResources(gl)
  let textures = createTextureStore(gl)
  let contextLost = false
  const trailData = new Float32Array(MAX_TRAIL_POINTS * 4)

  const onContextLost = (event: Event) => {
    event.preventDefault()
    contextLost = true
    textures.dispose()
    canvas.dataset.ready = 'false'
  }
  const onContextRestored = () => {
    resources = createResources(gl)
    textures = createTextureStore(gl)
    contextLost = false
  }

  canvas.addEventListener('webglcontextlost', onContextLost)
  canvas.addEventListener('webglcontextrestored', onContextRestored)
  canvas.dataset.renderer = 'webgl2-image-ascii'

  return {
    render(cards, _timeSeconds, viewportWidth, viewportHeight, trailPoints) {
      if (contextLost) return

      const dpr = Math.min(window.devicePixelRatio || 1, maxDevicePixelRatio)
      const pixelWidth = Math.max(1, Math.round(viewportWidth * dpr))
      const pixelHeight = Math.max(1, Math.round(viewportHeight * dpr))
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth
        canvas.height = pixelHeight
      }

      gl.viewport(0, 0, pixelWidth, pixelHeight)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
      gl.enable(gl.SCISSOR_TEST)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(resources.program)
      gl.bindVertexArray(resources.vertexArray)
      gl.uniform1f(resources.uniforms.dpr, dpr)
      gl.uniform1f(resources.uniforms.viewportHeight, viewportHeight)
      gl.activeTexture(gl.TEXTURE0)
      gl.uniform1i(resources.uniforms.image, 0)

      trailData.fill(0)
      const trailCount = Math.min(trailPoints.length, MAX_TRAIL_POINTS)
      for (let index = 0; index < trailCount; index += 1) {
        const point = trailPoints[index]
        const offset = index * 4
        trailData[offset] = point.x
        trailData[offset + 1] = point.y
        trailData[offset + 2] = point.strength
        trailData[offset + 3] = point.age
      }
      gl.uniform1i(resources.uniforms.trailCount, trailCount)
      gl.uniform4fv(resources.uniforms.trailPoints, trailData)

      let visibleCards = 0
      for (const card of cards) {
        const rectX = card.x * dpr
        const rectY = (viewportHeight - card.y - card.height) * dpr
        const rectWidth = Math.max(1, card.width * dpr)
        const rectHeight = Math.max(1, card.height * dpr)
        const rectRight = rectX + rectWidth
        const rectTop = rectY + rectHeight
        const clipLeft = Math.max(0, Math.floor(rectX))
        const clipBottom = Math.max(0, Math.floor(rectY))
        const clipRight = Math.min(pixelWidth, Math.ceil(rectRight))
        const clipTop = Math.min(pixelHeight, Math.ceil(rectTop))
        if (clipRight <= clipLeft || clipTop <= clipBottom) continue

        gl.scissor(
          clipLeft,
          clipBottom,
          clipRight - clipLeft,
          clipTop - clipBottom,
        )
        gl.uniform4f(
          resources.uniforms.rect,
          rectX,
          rectY,
          rectWidth,
          rectHeight,
        )
        gl.uniform1f(resources.uniforms.opacity, card.opacity ?? 1)
        gl.uniform1f(resources.uniforms.radius, card.borderRadius ?? 0)
        gl.uniform1f(resources.uniforms.effect, card.effect ?? 0)

        const image = card.imageUrl ? textures.get(card.imageUrl) : null
        gl.bindTexture(gl.TEXTURE_2D, image?.texture ?? textures.fallback)
        gl.uniform1i(resources.uniforms.hasImage, image?.ready ? 1 : 0)
        gl.uniform2f(
          resources.uniforms.imageSize,
          image?.width ?? 1,
          image?.height ?? 1,
        )
        gl.drawArrays(gl.TRIANGLES, 0, 3)
        visibleCards += 1
      }

      gl.bindTexture(gl.TEXTURE_2D, null)
      gl.bindVertexArray(null)
      gl.disable(gl.SCISSOR_TEST)
      if (canvas.dataset.ready !== 'true') canvas.dataset.ready = 'true'
      const visibleCardCount = String(visibleCards)
      if (canvas.dataset.visibleCards !== visibleCardCount) {
        canvas.dataset.visibleCards = visibleCardCount
      }
      const loadedTextureCount = String(textures.loadedCount())
      if (canvas.dataset.loadedTextures !== loadedTextureCount) {
        canvas.dataset.loadedTextures = loadedTextureCount
      }
    },
    dispose() {
      canvas.removeEventListener('webglcontextlost', onContextLost)
      canvas.removeEventListener('webglcontextrestored', onContextRestored)
      textures.dispose()
      destroyResources(gl, resources)
      canvas.dataset.ready = 'false'
    },
  }
}

function createTextureStore(gl: WebGL2RenderingContext) {
  const entries = new Map<string, TextureEntry>()
  const fallback = createSolidTexture(gl)
  let disposed = false

  return {
    fallback,
    get(url: string) {
      const existing = entries.get(url)
      if (existing) return existing

      const texture = createSolidTexture(gl)
      const entry: TextureEntry = {
        texture,
        width: 1,
        height: 1,
        ready: false,
      }
      entries.set(url, entry)

      const image = new Image()
      image.decoding = 'async'
      image.crossOrigin = 'anonymous'
      image.onload = () => {
        if (disposed) return
        gl.bindTexture(gl.TEXTURE_2D, texture)
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          image,
        )
        gl.bindTexture(gl.TEXTURE_2D, null)
        entry.width = image.naturalWidth
        entry.height = image.naturalHeight
        entry.ready = true
      }
      image.src = url
      return entry
    },
    loadedCount() {
      let count = 0
      entries.forEach((entry) => {
        if (entry.ready) count += 1
      })
      return count
    },
    dispose() {
      disposed = true
      entries.forEach((entry) => gl.deleteTexture(entry.texture))
      entries.clear()
      gl.deleteTexture(fallback)
    },
  }
}

function createSolidTexture(gl: WebGL2RenderingContext) {
  const texture = gl.createTexture()
  if (!texture) throw new Error('Could not allocate an ASCII media texture.')
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([0, 0, 0, 255]),
  )
  gl.bindTexture(gl.TEXTURE_2D, null)
  return texture
}

function createResources(gl: WebGL2RenderingContext) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
  const program = gl.createProgram()
  if (!program) throw new Error('Could not create the ASCII shader program.')
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  gl.deleteShader(vertexShader)
  gl.deleteShader(fragmentShader)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message =
      gl.getProgramInfoLog(program) ?? 'Unknown shader link error.'
    gl.deleteProgram(program)
    throw new Error(message)
  }

  const vertexArray = gl.createVertexArray()
  if (!vertexArray) {
    gl.deleteProgram(program)
    throw new Error('Could not create the ASCII shader vertex array.')
  }

  return {
    program,
    vertexArray,
    uniforms: {
      rect: requiredUniform(gl, program, 'u_rect'),
      dpr: requiredUniform(gl, program, 'u_dpr'),
      opacity: requiredUniform(gl, program, 'u_opacity'),
      radius: requiredUniform(gl, program, 'u_radius'),
      effect: requiredUniform(gl, program, 'u_effect'),
      viewportHeight: requiredUniform(gl, program, 'u_viewport_height'),
      image: requiredUniform(gl, program, 'u_image'),
      imageSize: requiredUniform(gl, program, 'u_image_size'),
      hasImage: requiredUniform(gl, program, 'u_has_image'),
      trailCount: requiredUniform(gl, program, 'u_trail_count'),
      trailPoints: requiredUniform(gl, program, 'u_trail_points[0]'),
    },
  }
}

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
) {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('Could not allocate an ASCII shader.')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? 'Unknown shader error.'
    gl.deleteShader(shader)
    throw new Error(message)
  }
  return shader
}

function requiredUniform(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  name: string,
) {
  const uniform = gl.getUniformLocation(program, name)
  if (!uniform) throw new Error(`Missing shader uniform: ${name}`)
  return uniform
}

function destroyResources(
  gl: WebGL2RenderingContext,
  resources: ReturnType<typeof createResources>,
) {
  gl.deleteVertexArray(resources.vertexArray)
  gl.deleteProgram(resources.program)
}
