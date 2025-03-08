exports.id = 'node'
exports.platform = process.platform
exports.arch = process.arch
exports.simulator = false
exports.host = `${exports.platform}-${exports.arch}`
exports.versions = process.versions
exports.conditions = ['node', exports.platform, exports.arch]
exports.extensions = { module: ['.js', '.json', '.node'], addon: ['.node'] }
exports.builtins = require('module').builtinModules

if (process.versions.electron) {
  exports.conditions = ['electron', ...exports.conditions]
  exports.builtins = ['electron', ...exports.builtins]
}
