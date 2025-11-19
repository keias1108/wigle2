/**
 * Transformer-Life Simulation - Default Parameters
 *
 * Architecture based on Transformer neural networks:
 * - Phase 1: Attention Mechanism (information conflict)
 * - Phase 2: Non-linear Activation (threshold firing)
 * - Phase 3: Residual Stream (structure accumulation)
 */

/**
 * Default parameter values for Transformer-Life simulation
 *
 * @typedef {Object} SimulationParams
 * @property {number} neighborhoodRadius - Sampling radius for attention mechanism
 * @property {number} varianceWeight - Weight for local variance in conflict calculation
 * @property {number} activationThreshold - Critical threshold for sigmoid firing
 * @property {number} activationSteepness - Sigmoid steepness (sharper = more binary)
 * @property {number} energyLearningRate - Rate of energy change from activation
 * @property {number} matterGrowthRate - Rate of matter accumulation (residual stream)
 * @property {number} matterDecayRate - Slow decay of accumulated matter
 * @property {number} matterResistance - How much matter suppresses new activation
 * @property {number} diffusionRate - Energy diffusion rate (optional spreading)
 * @property {number} globalAverage - System-wide average (for normalization)
 */
export const DEFAULT_PARAMS = {
  // ===== PHASE 1: ATTENTION MECHANISM =====
  // Controls how cells measure "information conflict" with neighbors
  neighborhoodRadius: 5.0,    // Sampling radius (grid cells)
  varianceWeight: 1.0,        // Weight for local variance in attention score

  // ===== PHASE 2: ACTIVATION FUNCTION =====
  // Controls the Leaky ReLU "firing" threshold
  activationThreshold: 0.15,  // Critical threshold (lower = easier to activate)
  activationSteepness: 2.0,   // Linear amplification (was 12.0 with Sigmoid)

  // ===== PHASE 3: RESIDUAL STREAM =====
  // Controls energy and matter dynamics
  energyLearningRate: 0.15,   // Rate of energy change from activation
  matterGrowthRate: 0.08,     // Rate of matter accumulation (structure)
  matterDecayRate: 0.002,     // Slow decay of matter
  matterResistance: 0.4,      // How much matter suppresses activation (feedback)

  // ===== GLOBAL DYNAMICS =====
  diffusionRate: 0.1,         // Energy diffusion (spreading)
  globalAverage: 0.0,         // System-wide average (for future normalization)
};

/**
 * UI control IDs that map to simulation parameters
 * Used for automatic slider/input binding
 */
export const PARAM_CONTROL_IDS = [
  'neighborhoodRadius',
  'varianceWeight',
  'activationThreshold',
  'activationSteepness',
  'energyLearningRate',
  'matterGrowthRate',
  'matterDecayRate',
  'matterResistance',
  'diffusionRate',
];

/**
 * Speed preset configurations
 * Maps UI buttons to simulation speed multipliers
 */
export const SPEED_PRESETS = [
  { selector: '.speed-btn[data-speed="0"]', value: 0 }, // Pause
  { selector: '.speed-btn[data-speed="1"]', value: 1 }, // Normal
  { selector: '.speed-btn[data-speed="2"]', value: 2 }, // 2x
  { selector: '.speed-btn[data-speed="5"]', value: 5 }, // 5x
];
