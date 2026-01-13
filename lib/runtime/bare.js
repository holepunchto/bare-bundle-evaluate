exports.host = Bare.Addon.host
exports.versions = Bare.versions
exports.conditions = ['bare', 'node', ...exports.host.split('-')]
exports.extensions = {
  module: ['.js', '.cjs', '.mjs', '.json', '.bare', '.node'],
  addon: ['.bare', '.node']
}
exports.builtins = []
