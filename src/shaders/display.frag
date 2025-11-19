/**
 * Transformer-Life Display Fragment Shader
 *
 * Visualizes the dual-channel system:
 * - R channel (Energy): Fast-changing attention-driven dynamics → COLOR
 * - G channel (Matter): Slow-accumulating residual stream → HEIGHT/STRUCTURE
 *
 * The visualization shows "2D energy creating 3D structure"
 */
uniform sampler2D fieldTexture;
varying vec2 vUv;

/**
 * Energy gradient: Maps R channel to vibrant colors
 * Represents fast-changing attention dynamics
 */
vec3 energyGradient(float energy) {
    vec3 color;

    if (energy < 0.1) {
        // Black to dark blue
        color = mix(vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 0.3), energy * 10.0);
    } else if (energy < 0.3) {
        // Dark blue to cyan
        color = mix(vec3(0.0, 0.0, 0.3), vec3(0.0, 0.5, 1.0), (energy - 0.1) * 5.0);
    } else if (energy < 0.5) {
        // Cyan to green
        color = mix(vec3(0.0, 0.5, 1.0), vec3(0.0, 1.0, 0.5), (energy - 0.3) * 5.0);
    } else if (energy < 0.7) {
        // Green to yellow
        color = mix(vec3(0.0, 1.0, 0.5), vec3(1.0, 1.0, 0.0), (energy - 0.5) * 5.0);
    } else {
        // Yellow to white
        color = mix(vec3(1.0, 1.0, 0.0), vec3(1.0, 1.0, 1.0), (energy - 0.7) * 3.33);
    }

    return color;
}

/**
 * Matter gradient: Maps G channel to structural height
 * Represents slow-accumulating residual stream (dimension emergence)
 */
vec3 matterGradient(float matter) {
    // Dark purple → Bright white (representing height/structure)
    vec3 lowMatter = vec3(0.1, 0.0, 0.2);    // Deep purple (low structure)
    vec3 highMatter = vec3(1.0, 1.0, 1.0);   // Bright white (high structure)

    return mix(lowMatter, highMatter, matter);
}

void main() {
    vec4 state = texture2D(fieldTexture, vUv);
    float energy = state.x;  // R: Fast-changing energy
    float matter = state.y;  // G: Slow-accumulating structure
    float attention = state.z; // B: Debug - attention score

    // Base color from energy dynamics
    vec3 energyColor = energyGradient(energy);

    // Structural overlay from matter accumulation
    vec3 matterColor = matterGradient(matter);

    // COMPOSITE: Energy provides hue, Matter provides luminance/height
    // Low matter: pure energy colors (2D dynamics)
    // High matter: brightened colors (3D structure emergence)
    vec3 finalColor = mix(
        energyColor,                          // Pure energy (flat)
        energyColor * 0.7 + matterColor * 0.5, // Energy + structure (elevated)
        matter                                 // Blend based on matter level
    );

    // Add slight glow to high-matter regions (structure highlighting)
    finalColor += vec3(matter * matter * 0.3);

    // Optional: Visualize attention score as subtle blue overlay (debug)
    // Uncomment to see attention hotspots
    // finalColor += vec3(0.0, 0.0, attention * 0.2);

    gl_FragColor = vec4(finalColor, 1.0);
}
