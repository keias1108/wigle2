/**
 * Transformer-Life Simulation - Lifecycle Shader
 *
 * Architecture inspired by Transformer neural networks:
 * - Phase 1 (Convergence): Attention Mechanism - measuring information conflict
 * - Phase 2 (Emission): MLP + Non-linear Activation - critical threshold firing
 * - Phase 3 (Residual Stream): State accumulation and feedback loop
 *
 * Channels:
 * - R: Energy (fast-changing, attention-driven)
 * - G: Matter (slow-accumulating, residual stream)
 * - B: Reserved for future use
 */

// Core texture and parameters
uniform sampler2D field;
uniform vec2 texelSize;

// Phase 1: Attention Mechanism
uniform float neighborhoodRadius;    // Sampling radius for neighbors
uniform float varianceWeight;        // Weight for local variance in conflict calculation

// Phase 2: Activation Function
uniform float activationThreshold;   // Critical threshold for firing (0.0-1.0)
uniform float activationSteepness;   // Sigmoid steepness (higher = sharper transition)

// Phase 3: Residual Stream
uniform float energyLearningRate;    // Rate of energy change from activation
uniform float matterGrowthRate;      // Rate of matter accumulation from activation
uniform float matterDecayRate;       // Slow decay of accumulated matter
uniform float matterResistance;      // How much matter suppresses new activation

// Global dynamics
uniform float diffusionRate;         // Optional: energy diffusion to neighbors
uniform float globalAverage;         // System-wide average energy (for normalization)

// User interaction
uniform sampler2D interactionTexture;

/**
 * Computes discrete Laplacian for diffusion (optional).
 * Uses 4-neighbor von Neumann stencil.
 */
float laplacian(vec2 uv) {
    float sum = 0.0;
    sum += texture2D(field, uv + vec2(-1.0, 0.0) * texelSize).x;
    sum += texture2D(field, uv + vec2(1.0, 0.0) * texelSize).x;
    sum += texture2D(field, uv + vec2(0.0, -1.0) * texelSize).x;
    sum += texture2D(field, uv + vec2(0.0, 1.0) * texelSize).x;
    sum -= 4.0 * texture2D(field, uv).x;
    return sum;
}

/**
 * Leaky ReLU activation function.
 * Prevents Vanishing Gradient problem that kills energy.
 *
 * Why not Sigmoid?
 * - Sigmoid squashes values to [0,1], causing energy to vanish
 * - Small values → 0.00001 → 0.00000001 → DEAD
 *
 * Why Leaky ReLU?
 * - Above threshold: LINEAR growth → EXPLOSIVE propagation
 * - Below threshold: 10% leak → keeps the "spark" alive
 *
 * @param x Input value
 * @param threshold Activation threshold
 * @param steepness Slope multiplier for superthreshold values
 * @param leak Leak coefficient for subthreshold values (default: 0.1)
 * @return Activated value (unbounded, can explode!)
 */
float leakyReLU(float x, float threshold, float steepness, float leak) {
    float excess = x - threshold;
    if (excess > 0.0) {
        // Superthreshold: LINEAR amplification (allows explosion)
        return excess * steepness;
    } else {
        // Subthreshold: Keep 10% alive (prevents total death)
        return excess * leak;
    }
}

void main() {
    vec2 uv = gl_FragCoord.xy * texelSize;

    // Current state
    vec4 currentState = texture2D(field, uv);
    float currentEnergy = currentState.x;  // R channel
    float currentMatter = currentState.y;  // G channel (Residual Stream)

    // User interaction (energy injection)
    vec3 interaction = texture2D(interactionTexture, uv).rgb;
    float injectedEnergy = interaction.r * 0.1;

    // ========================================================================
    // PHASE 1: CONVERGENCE (Attention Mechanism - The Conflict)
    // ========================================================================
    // "에너지·정보가 많은 곳에서는 항상 두 힘의 대립이 생긴다"
    //
    // We don't just sum neighbor energies. We measure INFORMATION IMBALANCE.
    // This is the "conflict" between center and neighbors.

    float neighborSum = 0.0;
    float neighborCount = 0.0;
    int radius = int(ceil(neighborhoodRadius));

    // Sample neighbors within radius
    for (int dy = -radius; dy <= radius; dy++) {
        for (int dx = -radius; dx <= radius; dx++) {
            if (dx == 0 && dy == 0) continue; // Skip center

            vec2 offset = vec2(float(dx), float(dy));
            float dist = length(offset);

            if (dist <= neighborhoodRadius) {
                vec2 neighborUV = fract(uv + offset * texelSize);
                float neighborEnergy = texture2D(field, neighborUV).x;

                neighborSum += neighborEnergy;
                neighborCount += 1.0;
            }
        }
    }

    // Compute neighbor average
    float neighborAvg = (neighborCount > 0.0) ? (neighborSum / neighborCount) : currentEnergy;

    // LOCAL VARIANCE: Measure information imbalance in neighborhood
    float localVariance = 0.0;
    for (int dy = -radius; dy <= radius; dy++) {
        for (int dx = -radius; dx <= radius; dx++) {
            if (dx == 0 && dy == 0) continue;

            vec2 offset = vec2(float(dx), float(dy));
            float dist = length(offset);

            if (dist <= neighborhoodRadius) {
                vec2 neighborUV = fract(uv + offset * texelSize);
                float neighborEnergy = texture2D(field, neighborUV).x;

                float diff = neighborEnergy - neighborAvg;
                localVariance += diff * diff;
            }
        }
    }
    localVariance = (neighborCount > 0.0) ? sqrt(localVariance / neighborCount) : 0.0;

    // CENTER CONFLICT: How different is this cell from its neighborhood?
    float centerConflict = abs(currentEnergy - neighborAvg);

    // ATTENTION SCORE: Combined measure of local conflict
    // This is the "두 힘의 대립" (conflict between two forces)
    float attentionScore = centerConflict + localVariance * varianceWeight;

    // ========================================================================
    // PHASE 2: EMISSION (MLP & Non-linear Activation - The Criticality)
    // ========================================================================
    // "비선형 피드백이 생기고... 임계점을 넘으면"
    //
    // CRITICAL FIX: Replaced Sigmoid with Leaky ReLU
    // - Sigmoid caused VANISHING GRADIENT → energy death
    // - Leaky ReLU allows EXPLOSIVE propagation + keeps spark alive

    // Apply matter resistance: high structure suppresses new activation
    // This creates the feedback loop from Phase 3
    float effectiveThreshold = activationThreshold + currentMatter * matterResistance;

    // FIRING: Leaky ReLU activation (not Sigmoid!)
    float activation = leakyReLU(attentionScore, effectiveThreshold, activationSteepness, 0.1);

    // Soft clamp to prevent runaway explosion (but allow strong propagation)
    // Using tanh for smooth saturation instead of hard clamp
    activation = tanh(activation * 0.5) * 2.0; // Scale down, squash, scale up

    // ========================================================================
    // PHASE 3: NEW DIMENSION (Residual Stream - The Structure)
    // ========================================================================
    // "기존 좌표계로는 설명 안 되는 새로운 유효 차원이 생긴다"
    //
    // G channel is NOT just a visual effect. It's the RESIDUAL STREAM.
    // It stores the accumulated state of the system.

    // UPDATE ENERGY (R channel): Fast-changing, driven by activation
    float energyDelta = activation * energyLearningRate;

    // Add diffusion (optional spreading)
    float diffusion = laplacian(uv) * diffusionRate;

    // Add user interaction
    energyDelta += injectedEnergy;

    // Apply energy update
    float newEnergy = currentEnergy + energyDelta + diffusion;

    // UPDATE MATTER (G channel): Slow-accumulating residual stream
    // Only ACTIVATION creates structure. Not energy directly.
    float matterDelta = activation * matterGrowthRate;

    // Slow decay of matter
    float matterDecay = currentMatter * matterDecayRate;

    // Apply matter update
    float newMatter = currentMatter + matterDelta - matterDecay;

    // NORMALIZATION (Layer Norm concept)
    // Prevent unbounded growth
    newEnergy = clamp(newEnergy, 0.0, 1.0);
    newMatter = clamp(newMatter, 0.0, 1.0);

    // Add tiny noise to prevent stagnation
    float noise = fract(sin(dot(uv * 1000.0 + currentEnergy, vec2(12.9898, 78.233))) * 43758.5453);
    newEnergy += (noise - 0.5) * 0.0001;

    // ========================================================================
    // OUTPUT
    // ========================================================================
    // R: Energy (순간적인 attention 결과, fast-changing)
    // G: Matter (시간이 응축된 구조, slow-accumulating)
    // B: Debug channel (attentionScore for visualization)

    gl_FragColor = vec4(
        clamp(newEnergy, 0.0, 1.0),
        clamp(newMatter, 0.0, 1.0),
        clamp(attentionScore, 0.0, 1.0), // Debug: attention visualization
        1.0
    );
}
