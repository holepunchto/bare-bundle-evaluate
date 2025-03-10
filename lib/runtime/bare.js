exports.platform = Bare.platform
exports.arch = Bare.arch
exports.simulator = Bare.simulator
exports.host = Bare.Addon.host
exports.versions = Bare.versions
exports.conditions = ['bare', 'node', exports.arch, exports.platform]
exports.extensions = {
  module: ['.js', '.cjs', '.mjs', '.json', '.bare', '.node'],
  addon: ['.bare', '.node']
}
exports.builtins = []
