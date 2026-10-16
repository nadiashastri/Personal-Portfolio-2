import { ShaderChunk, type WebGLProgramParametersWithUniforms } from 'three'

/**
 * Double-sided foliage normally flips normals on back faces, which makes half
 * the leaf cards render dark. Foliage supplies its own "volume" normals, so
 * keep them as-is on both sides.
 */
export function keepNormalsOnBackfaces(shader: WebGLProgramParametersWithUniforms) {
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <normal_fragment_begin>',
    ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', ''),
  )
}

/** Shared clock uniform so every wind-animated material sways in sync. */
export const windTime = { value: 0 }
