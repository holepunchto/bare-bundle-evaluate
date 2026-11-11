const hostParser = require('bare-host-parser')

exports.host = Bare.Addon.host
exports.versions = Bare.versions
exports.conditions = ['bare', 'node', ...hostParser.conditions(exports.host)]
exports.extensions = {
  module: ['.js', '.cjs', '.mjs', '.json', '.bare', '.node'],
  addon: ['.bare', '.node']
}
exports.builtins = []
