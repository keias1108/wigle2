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

    // Dual-channel architecture (Neural Cellular Automata)
    // R channel: Energy (fast, high-frequency, for color)
    // G channel: Matter (slow, accumulated, for geometry)
    float currentEnergy = texture2D(field, uv).x;
    float currentMatter = texture2D(field, uv).y;
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

    // G channel (Matter): Residual connection with slow accumulation
    // Acts as physical mass that slowly follows energy flow
    // 0.05 = low smoothness factor for viscous, honey-like movement
    float newMatter = mix(currentMatter, newEnergy, 0.05);
    newMatter = clamp(newMatter, 0.0, 1.0);

    // Output dual-channel: R=Energy (flow), G=Matter (structure)
    gl_FragColor = vec4(newEnergy, newMatter, 0.0, 1.0);
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

    // G channel (Matter) for displacement - smooth, viscous terrain
    // This channel slowly accumulates and provides stable geometry
    float height = texture2D(fieldTexture, uv).g;
    vHeight = height;

    // Create displaced position (2.5D terrain effect)
    vec3 displaced = position;
    displaced.z = height * displacementScale;

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

// Deep Space color palette
// Black → Dark Blue → Purple → Cyan → White
vec3 energyGradient(float energy) {
    vec3 color;

    if (energy < 0.2) {
        // Deep space: pure black to very dark navy
        vec3 black = vec3(0.0, 0.0, 0.0);
        vec3 darkNavy = vec3(0.0, 0.0, 0.15);
        color = mix(black, darkNavy, energy / 0.2);
    } else if (energy < 0.5) {
        // Dark blue to purple
        vec3 darkBlue = vec3(0.0, 0.0, 0.5);
        vec3 purple = vec3(0.4, 0.0, 0.6);
        color = mix(darkBlue, purple, (energy - 0.2) / 0.3);
    } else if (energy < 0.8) {
        // Purple to bright cyan
        vec3 purple = vec3(0.4, 0.0, 0.6);
        vec3 cyan = vec3(0.0, 0.8, 1.0);
        color = mix(purple, cyan, (energy - 0.5) / 0.3);
    } else {
        // Bright cyan to white
        vec3 cyan = vec3(0.0, 0.8, 1.0);
        vec3 white = vec3(1.0, 1.0, 1.0);
        color = mix(cyan, white, (energy - 0.8) / 0.2);

        // Subtle sparkle at very high energy
        color += vec3(0.1) * sin(energy * 30.0) * smoothstep(0.9, 1.0, energy);
    }

    return color;
}

void main() {
    // Dual-channel separation
    float energy = texture2D(fieldTexture, vUv).r;  // R: Fast energy flow
    float matter = texture2D(fieldTexture, vUv).g;  // G: Slow terrain structure

    // G channel (Matter) for normal calculation - smooth, stable structure
    float heightL = texture2D(fieldTexture, vUv + vec2(-texelSize, 0.0)).g;
    float heightR = texture2D(fieldTexture, vUv + vec2(texelSize, 0.0)).g;
    float heightD = texture2D(fieldTexture, vUv + vec2(0.0, -texelSize)).g;
    float heightU = texture2D(fieldTexture, vUv + vec2(0.0, texelSize)).g;

    // Calculate gradients (slope) - stronger for visible depth
    float dx = (heightR - heightL) * displacementScale;
    float dy = (heightU - heightD) * displacementScale;

    // Normal vector (stronger bump mapping for 3D depth perception)
    vec3 normal = normalize(vec3(-dx * 10.0, -dy * 10.0, 1.0));

    // Light from above-right for dramatic shadows
    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));

    // Diffuse lighting (stronger contrast for visible terrain)
    float diffuse = max(dot(normal, lightDir), 0.0);

    // Low ambient, high diffuse for dramatic shadows (30% ambient, 70% diffuse)
    float lighting = 0.3 + 0.7 * diffuse;

    // Base terrain color (G channel = black to deep rich purple)
    vec3 darkRock = vec3(0.0, 0.0, 0.05);    // Almost black with hint of purple
    vec3 lightRock = vec3(0.45, 0.0, 0.7);   // Deep rich vivid purple
    vec3 terrainColor = mix(darkRock, lightRock, matter);

    // Apply lighting to terrain (creates shadows and highlights)
    vec3 litTerrain = terrainColor * lighting;

    // Energy glow (R channel = electric neon overlay)
    vec3 energyGlow = energyGradient(energy);

    // Additive blending: dark terrain + bright energy glow
    // Energy acts as "lightning flowing over mountains"
    vec3 finalColor = litTerrain + energyGlow * energy * 0.8;

    gl_FragColor = vec4(finalColor, 1.0);
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
