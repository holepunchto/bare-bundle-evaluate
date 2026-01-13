exports.host = `${process.platform}-${process.arch}`
exports.versions = process.versions
exports.conditions = ['node', ...exports.host.split('-')]
exports.extensions = { module: ['.js', '.json', '.node'], addon: ['.node'] }
exports.builtins = require('module').builtinModules

if (process.versions.electron) {
  exports.conditions = ['electron', process.type, ...exports.conditions]
  exports.builtins = ['electron', ...exports.builtins]
}
