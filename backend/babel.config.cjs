const path = require('path');

function resolvePreset(name) {
  try {
    return require.resolve(name);
  } catch (err) {
    // fallback to workspace root node_modules (pnpm stores many packages at root)
    const rootCandidate = path.resolve(__dirname, '..', '..', 'node_modules', name.replace('@', ''));
    try {
      return require.resolve(rootCandidate);
    } catch (err2) {
      // last resort: return name (let Node try to resolve it)
      return name;
    }
  }
}

module.exports = {
  presets: [
    [resolvePreset('@babel/preset-env'), { targets: { node: 'current' }, modules: 'auto' }]
  ]
};
