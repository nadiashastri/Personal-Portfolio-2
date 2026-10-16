/**
 * GLSL helpers shared by the ground, grass and foliage shaders so their
 * colours line up exactly (a blade of grass matches the lawn beneath it).
 */
export const NOISE_GLSL = /* glsl */ `
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
      mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      sum += amp * valueNoise(p);
      p = p * 2.03 + vec2(17.1, 9.2);
      amp *= 0.5;
    }
    return sum;
  }

  /** Lawn colour at a world XZ position: broad patches, mid variation and a few drier spots. */
  vec3 lawnColor(vec2 p) {
    vec3 dark = vec3(0.17, 0.33, 0.09);
    vec3 light = vec3(0.33, 0.52, 0.15);
    vec3 dry = vec3(0.48, 0.52, 0.22);
    float broad = fbm(p * 0.025);
    float mid = valueNoise(p * 0.22);
    vec3 c = mix(dark, light, clamp(0.15 + broad * 0.9 + (mid - 0.5) * 0.35, 0.0, 1.0));
    float dryness = smoothstep(0.58, 0.8, fbm(p * 0.045 + 31.0));
    return mix(c, dry, dryness * 0.35);
  }
`
