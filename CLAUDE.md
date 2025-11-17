# CLAUDE.md - AI Assistant Guide for wigle2

## Project Overview

**wigle2** is an Advanced Energy Life Simulation - a real-time, GPU-accelerated physics simulation built with Three.js and WebGL. The project simulates emergent life-like patterns through energy dynamics, featuring reaction-diffusion systems with interactive controls.

**Project Type**: Interactive WebGL visualization/simulation
**Language**: JavaScript (ES6 Modules)
**Primary Framework**: Three.js r128
**Architecture**: Client-side GPU computation with shader-based physics

## Technology Stack

- **Rendering**: Three.js (WebGL)
- **Computation**: Custom GPU Computation Renderer with GLSL shaders
- **Language**: Vanilla JavaScript (ES6 modules)
- **Testing**: Playwright (browser automation)
- **Code Quality**: ESLint + Prettier
- **Build**: None (vanilla JS served directly)

## Project Structure

```
wigle2/
├── index.html              # Main HTML entry point with embedded UI/styles
├── src/
│   ├── main.js            # Application entry point, initializes simulation
│   ├── app.js             # EnergyLifeSimulation class (main application logic)
│   ├── config.js          # Configuration constants and default parameters
│   ├── shaders.js         # GLSL shader code for physics simulation
│   └── gpuComputationRenderer.js  # Custom GPU computation framework
├── tests/
│   └── console.spec.js    # Playwright tests for parameter syncing
├── package.json           # Dependencies and scripts
├── playwright.config.js   # Playwright test configuration
├── .eslintrc.cjs          # ESLint configuration
├── .prettierrc.json       # Prettier code formatting rules
└── .gitignore            # Git ignore patterns
```

## Core Components

### 1. **EnergyLifeSimulation** (`src/app.js`)
The main application class that orchestrates the entire simulation.

**Key Responsibilities**:
- WebGL renderer setup and management
- GPU computation pipeline initialization
- UI control binding and event handling
- Real-time interaction (mouse/keyboard input)
- FPS monitoring and performance chart rendering
- Canvas resizing functionality

**Architecture Pattern**: Single class with private methods (using `#` syntax)

**Important Methods**:
- `init()` - Initialization sequence, sets up all subsystems
- `animate()` - Main render loop (RAF-based)
- `#initComputeRenderer()` - Sets up GPU computation pipeline
- `#setupControls()` - Binds UI controls to simulation parameters
- `#computeAverage()` - Downsample pipeline for energy averaging

### 2. **GPUComputationRenderer** (`src/gpuComputationRenderer.js`)
Custom GPU computation framework (similar to THREE.GPUComputationRenderer but simplified).

**Key Concepts**:
- Uses ping-pong rendering (double buffering) for iterative computation
- Renders computation results to Float32 textures
- Variables can have dependencies on other variables
- Each frame, computes next state by rendering with compute shaders

**Usage Pattern**:
```javascript
const computeRenderer = new GPUComputationRenderer(size, size, renderer);
const texture = computeRenderer.createTexture();
const variable = computeRenderer.addVariable('name', shader, texture);
computeRenderer.setVariableDependencies(variable, [variable]);
computeRenderer.compute(); // Run one step
```

### 3. **Lifecycle Shader** (`src/shaders.js`)
GLSL fragment shader implementing the physics simulation.

**Physics Model**:
- **Kernel-based potential field**: Inner attraction, outer repulsion
- **Growth function**: Bell curve centered around optimal energy
- **Energy economy**: Decay (metabolism), diffusion, fission
- **Instability**: High-energy cells become unstable
- **User interaction**: Energy injection, attraction/repulsion forces

**Key Parameters** (all exposed as uniforms):
- `innerRadius`, `innerStrength` - Inner attraction zone
- `outerRadius`, `outerStrength` - Outer repulsion zone
- `growthCenter`, `growthWidth`, `growthRate` - Growth bell curve
- `decayRate`, `diffusionRate` - Energy dissipation
- `fissionThreshold`, `instabilityFactor` - High-energy behavior

### 4. **Configuration** (`src/config.js`)
Centralized constants and default parameters.

**Key Exports**:
- `SIMULATION_SIZE` - GPU texture resolution (512x512)
- `DEFAULT_PARAMS` - All physics parameter defaults
- `PARAM_CONTROL_IDS` - List of controllable parameters
- `INTERACTION_MODES` - Available mouse interaction modes

## Development Workflows

### Running the Application

**Local Development**:
```bash
# No build step required - open index.html directly in browser
# OR use a simple HTTP server:
python3 -m http.server 8000
# Then visit: http://localhost:8000
```

**Key Requirements**:
- Modern browser with WebGL support
- Three.js loaded from CDN (in index.html)
- File served via HTTP (not `file://`) for module support

### Testing

```bash
# Install dependencies (first time only)
npm install

# Run Playwright tests
npm run test:playwright
```

**Test Strategy**:
- Browser automation tests (Playwright)
- Tests verify parameter syncing between UI and GPU uniforms
- Tests check for console errors during load
- Tests validate energy simulation stays within bounds [0,1]

**Test File Location**: `tests/console.spec.js`

### Code Style and Formatting

**ESLint Configuration** (`.eslintrc.cjs`):
- Extends: `eslint:recommended`, `prettier`
- Environment: Browser, ES2021
- Parser: ESNext modules

**Prettier Configuration** (`.prettierrc.json`):
- Semicolons: Yes
- Quotes: Single
- Trailing commas: All

**Running Linters**:
```bash
# Format code
npx prettier --write "src/**/*.js"

# Lint code
npx eslint src/
```

## Key Conventions for AI Assistants

### 1. **File Modification Guidelines**

**DO**:
- Keep shader code in `src/shaders.js` as template literals
- Use private methods (`#methodName`) for internal class methods
- Maintain centralized configuration in `src/config.js`
- Update tests when changing parameters or behavior
- Follow existing code formatting (Prettier enforced)

**DON'T**:
- Create build configuration (this is a vanilla JS project)
- Add bundling/transpilation (ES6 modules work natively)
- Modify Three.js CDN version without testing
- Hard-code values that should be in `config.js`

### 2. **Adding New Parameters**

To add a new simulation parameter:

1. **Add to `DEFAULT_PARAMS`** in `src/config.js`
2. **Add to `PARAM_CONTROL_IDS`** array in `src/config.js`
3. **Add UI controls** in `index.html` (slider + number input pair)
4. **Add uniform** to field variable in `app.js` `#initComputeRenderer()`
5. **Use in shader** in `src/shaders.js` `getLifecycleShader()`
6. **Add test** in `tests/console.spec.js` using `createParameterTest()`

### 3. **Shader Development**

**Important Notes**:
- Shaders are GLSL ES 1.0 (WebGL 1.0 compatible)
- Use `texture2D()`, not `texture()`
- All shader code lives in `src/shaders.js` as string templates
- Uniforms must match exactly between JS and GLSL
- Test shader changes in browser DevTools for compilation errors

**Debugging Shaders**:
- Check browser console for WebGL errors
- Use `gl_FragColor = vec4(debugValue, 0.0, 0.0, 1.0);` for visualization
- Verify uniform values in DevTools: `window.energyLifeSim.computeVariables.field.material.uniforms`

### 4. **Performance Considerations**

**Critical Performance Paths**:
- Shader execution (runs every frame at 512x512 resolution)
- Downsampling pipeline (for average energy calculation)
- Mouse interaction texture updates

**Optimization Guidelines**:
- Keep shader kernel sizes reasonable (currently 10x10 = 441 samples)
- Avoid array allocations in hot paths
- Use Float32Array for texture data manipulation
- Batch uniform updates when possible

### 5. **Browser Compatibility**

**Required Features**:
- WebGL 1.0 with `OES_texture_float` extension
- ES6 module support
- Pointer events
- RequestAnimationFrame

**Known Limitations**:
- Mobile performance may vary (GPU intensive)
- File:// protocol doesn't work (needs HTTP server)
- Requires hardware that supports floating-point textures

### 6. **Git Workflow**

**Branch Naming**:
- Feature branches: `claude/claude-md-*` (auto-generated)
- Always develop on designated branch (see task instructions)

**Commit Guidelines**:
- Write descriptive commit messages
- One logical change per commit
- Test before committing

**Ignored Files** (`.gitignore`):
- `node_modules/`
- `test-results/`, `playwright-report/`
- Log files (`*.log`)
- Local environment files (`.env*`)
- `AGENTS.md`, `VISION.md` (local only)

### 7. **Common Tasks**

**Adjust Simulation Physics**:
- Modify default values in `src/config.js` `DEFAULT_PARAMS`
- OR adjust shader equations in `src/shaders.js`

**Change Visualization Colors**:
- Edit `energyGradient()` function in display shader (`app.js` line 204-225)

**Add New Interaction Mode**:
1. Add mode to `INTERACTION_MODES` in `config.js`
2. Add button in `index.html` interaction-mode section
3. Handle mode in `#updateInteractionTexture()` in `app.js`
4. Update shader to use interaction data appropriately

**Modify Canvas/UI Layout**:
- All UI and styles are in `index.html` `<style>` section
- Canvas sizing: `INITIAL_CANVAS_WIDTH/HEIGHT` in `config.js`

### 8. **Debugging Tips**

**Check Simulation State**:
```javascript
// In browser console:
window.energyLifeSim.params  // Current parameter values
window.energyLifeSim.computeVariables.field.material.uniforms  // GPU uniforms
window.energyLifeSim.chartHistory  // Energy history
```

**Common Issues**:
- **Black screen**: Check console for WebGL errors, verify shader compilation
- **Frozen simulation**: Check speed multiplier, verify `isPaused` state
- **Parameter not working**: Verify uniform is set, check shader uses it
- **Performance issues**: Check GPU stats, reduce `SIMULATION_SIZE`

### 9. **Testing Strategy**

**Current Test Coverage**:
- UI control synchronization with GPU uniforms
- Parameter range validation
- Console error detection
- Simulation bounds checking (energy ∈ [0,1])

**When Adding Features**:
- Add corresponding Playwright test if UI-related
- Test parameter persistence (save/load presets)
- Verify no console errors during interaction
- Check mobile responsiveness if changing UI

### 10. **Documentation Updates**

**When to Update This File**:
- Adding new major features or subsystems
- Changing project structure or architecture
- Modifying development workflow or tooling
- Adding new dependencies
- Discovering important patterns or conventions

## Troubleshooting

### Issue: Tests Reference `wigle.html` But File Doesn't Exist
**Status**: Known issue - test file references incorrect filename
**Current**: Tests look for `wigle.html`
**Actual**: Main file is `index.html`
**Fix**: Update `tests/console.spec.js` line 6 to use `index.html`

### Issue: Cannot Run Locally
**Cause**: ES6 modules require HTTP server
**Solution**: Use `python3 -m http.server` or similar

### Issue: Shader Compilation Failed
**Debug Steps**:
1. Check browser console for specific error
2. Verify uniform declarations match JS code
3. Check GLSL syntax (semicolons, types, etc.)
4. Test in browser with simplified shader

## Project Goals and Design Philosophy

**Primary Goal**: Create emergent, life-like patterns through simple physics rules

**Design Principles**:
- GPU-first: Leverage parallel processing for complex simulations
- Real-time interaction: Users can influence simulation dynamically
- Parameter exploration: Expose all physics parameters for experimentation
- Visual feedback: Clear, colorful energy visualization
- Performance: 60 FPS target on modern hardware

**Inspiration**: Reaction-diffusion systems, Lenia, cellular automata, artificial life

## Future Enhancement Ideas

- Preset library with named configurations
- Recording/playback of simulations
- Multi-species simulation (multiple energy fields)
- WebGPU migration for better performance
- Mobile touch optimization
- URL parameter loading for sharing configurations

---

**Last Updated**: 2025-11-17
**Project Version**: 1.0.0
**Maintained By**: AI-assisted development workflow
