/**
 * Shader Loader Utilities
 *
 * Functions to load and manage GLSL shader code.
 * In production, shaders would be loaded via fetch() or bundled.
 * For now, we inline them as strings for compatibility.
 */

import { KERNEL_SIZE } from '../config/constants.js';

/**
 * Gets the lifecycle shader code with template replacements
 *
 * @returns {string} GLSL fragment shader code
 */
export function getLifecycleShader() {
  // In a more advanced setup, this would load from lifecycle.glsl
  // For now, we inline the shader content
  return `
uniform sampler2D field;
uniform float innerRadius;
uniform float innerStrength;
uniform float outerRadius;
uniform float outerStrength;
uniform float growthCenter;
uniform float growthWidth;
uniform float growthRate;
uniform float suppressionFactor;
uniform float globalAverage;
uniform float decayRate;
uniform float diffusionRate;
uniform float fissionThreshold;
uniform float instabilityFactor;
uniform sampler2D interactionTexture;
uniform vec2 texelSize;

float kernelWeight(float dist) {
    float weight = 0.0;

    if (dist < innerRadius) {
        float t = 1.0 - (dist / innerRadius);
        weight += innerStrength * t * t;
    }

    float ringStart = innerRadius + 1.0;
    float ringEnd = outerRadius;
    if (dist > ringStart && dist < ringEnd) {
        float t = (dist - ringStart) / (ringEnd - ringStart);
        weight += outerStrength * exp(-2.0 * t * t);
    }

    return weight;
}

float growthFunction(float potential, float currentEnergy) {
    float x = (potential - growthCenter) / growthWidth;
    float bellCurve = exp(-x * x * 0.5);

    if (currentEnergy > fissionThreshold) {
        float excess = (currentEnergy - fissionThreshold) / (1.0 - fissionThreshold);
        bellCurve -= excess * instabilityFactor;
    }

    return bellCurve;
}

float laplacian(vec2 uv) {
    float sum = 0.0;
    sum += texture2D(field, uv + vec2(-1.0, 0.0) * texelSize).x;
    sum += texture2D(field, uv + vec2(1.0, 0.0) * texelSize).x;
    sum += texture2D(field, uv + vec2(0.0, -1.0) * texelSize).x;
    sum += texture2D(field, uv + vec2(0.0, 1.0) * texelSize).x;
    sum -= 4.0 * texture2D(field, uv).x;
    return sum;
}

float random(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec2 uv = gl_FragCoord.xy * texelSize;

    float currentEnergy = texture2D(field, uv).x;
    vec3 interaction = texture2D(interactionTexture, uv).rgb;

    float potential = 0.0;
    float totalWeight = 0.0;

    int kernelSize = ${KERNEL_SIZE};
    for (int dy = -kernelSize; dy <= kernelSize; dy++) {
        for (int dx = -kernelSize; dx <= kernelSize; dx++) {
            vec2 offset = vec2(float(dx), float(dy));
            float dist = length(offset);

            if (dist <= outerRadius) {
                vec2 neighborUV = fract(uv + offset * texelSize);
                float neighborEnergy = texture2D(field, neighborUV).x;
                float weight = kernelWeight(dist);

                weight += interaction.g * 2.0 - interaction.b * 2.0;

                potential += neighborEnergy * weight;
                totalWeight += abs(weight);
            }
        }
    }

    if (totalWeight > 0.0) {
        potential /= totalWeight;
    }

    float growth = growthFunction(potential, currentEnergy) - 0.5;
    growth -= globalAverage * suppressionFactor;

    float metabolism = currentEnergy * currentEnergy * decayRate;
    float diffusion = laplacian(uv) * diffusionRate;

    float fissionNoise = 0.0;
    if (currentEnergy > fissionThreshold) {
        float excess = (currentEnergy - fissionThreshold) / (1.0 - fissionThreshold);
        float chaos = sin(dot(uv * 100.0 + currentEnergy * 50.0, vec2(12.9898, 78.233)));
        fissionNoise = chaos * excess * 0.1;
    }

    float interactionEnergy = interaction.r * 0.1;

    float deltaEnergy = growthRate * growth - metabolism + diffusion + fissionNoise + interactionEnergy;
    float newEnergy = currentEnergy + deltaEnergy;

    float noise = (random(uv + currentEnergy) - 0.5) * 0.001;
    newEnergy += noise;

    newEnergy = clamp(newEnergy, 0.0, 1.0);

    gl_FragColor = vec4(newEnergy, 0.0, 0.0, 1.0);
}
`;
}

/**
 * Gets the display vertex shader
 * @returns {string} GLSL vertex shader code
 */
export function getDisplayVertexShader() {
  return `
uniform sampler2D fieldTexture;
uniform float displacementScale;
varying vec2 vUv;
varying float vHeight;

void main() {
    vUv = uv;

    // Sample energy value from texture
    float energy = texture2D(fieldTexture, uv).r;
    vHeight = energy;

    // Create displaced position (2.5D terrain effect)
    vec3 displaced = position;
    displaced.z = energy * displacementScale;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
`;
}

/**
 * Gets the display fragment shader
 * @returns {string} GLSL fragment shader code
 */
export function getDisplayFragmentShader() {
  return `
uniform sampler2D fieldTexture;
uniform float displacementScale;
uniform float texelSize;
varying vec2 vUv;
varying float vHeight;

// Cosine palette for smooth color transitions
// Based on Inigo Quilez's technique
vec3 cosinePalette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
}

vec3 energyGradient(float energy) {
    // Use cosine palette for smooth blue → cyan → green → yellow → white
    vec3 a = vec3(0.5, 0.5, 0.5);    // DC offset
    vec3 b = vec3(0.5, 0.5, 0.5);    // Amplitude
    vec3 c = vec3(1.0, 1.0, 1.0);    // Frequency
    vec3 d = vec3(0.0, 0.10, 0.20);  // Phase shift (blue → cyan → green → yellow)

    vec3 color = cosinePalette(energy, a, b, c, d);

    // Enhance brightness at high energy levels
    color += energy * 0.15;

    // Add subtle sparkle at very high energy (smoother than before)
    if (energy > 0.85) {
        color += vec3(0.1) * sin(energy * 30.0) * smoothstep(0.85, 1.0, energy);
    }

    return color;
}

void main() {
    float energy = texture2D(fieldTexture, vUv).x;

    // Calculate normal from height differences for lighting
    float heightL = texture2D(fieldTexture, vUv + vec2(-texelSize, 0.0)).x;
    float heightR = texture2D(fieldTexture, vUv + vec2(texelSize, 0.0)).x;
    float heightD = texture2D(fieldTexture, vUv + vec2(0.0, -texelSize)).x;
    float heightU = texture2D(fieldTexture, vUv + vec2(0.0, texelSize)).x;

    // Calculate gradients (slope) - reduced for subtler lighting
    float dx = (heightR - heightL) * displacementScale;
    float dy = (heightU - heightD) * displacementScale;

    // Normal vector (very subtle bump mapping for smooth appearance)
    vec3 normal = normalize(vec3(-dx * 3.0, -dy * 3.0, 1.0));

    // Light from directly above with slight angle
    vec3 lightDir = normalize(vec3(0.2, 0.2, 1.0));

    // Diffuse lighting
    float diffuse = max(dot(normal, lightDir), 0.0);

    // Much more ambient, minimal diffuse for natural, non-flickering look
    float lighting = 0.75 + 0.25 * diffuse;

    // Apply lighting to color
    vec3 baseColor = energyGradient(energy);
    vec3 litColor = baseColor * lighting;

    gl_FragColor = vec4(litColor, 1.0);
}
`;
}

/**
 * Gets the downsample fragment shader for averaging
 * @returns {string} GLSL fragment shader code
 */
export function getDownsampleFragmentShader() {
  return `
uniform sampler2D inputTexture;
uniform vec2 texelSize;
void main() {
    vec2 coord = gl_FragCoord.xy - vec2(0.5);
    vec2 base = coord * 2.0;
    vec2 uv00 = (base + vec2(0.5, 0.5)) * texelSize;
    vec2 uv10 = (base + vec2(1.5, 0.5)) * texelSize;
    vec2 uv01 = (base + vec2(0.5, 1.5)) * texelSize;
    vec2 uv11 = (base + vec2(1.5, 1.5)) * texelSize;
    float sum = (
        texture2D(inputTexture, uv00).x +
        texture2D(inputTexture, uv10).x +
        texture2D(inputTexture, uv01).x +
        texture2D(inputTexture, uv11).x
    ) * 0.25;
    gl_FragColor = vec4(sum, 0.0, 0.0, 1.0);
}
`;
}
