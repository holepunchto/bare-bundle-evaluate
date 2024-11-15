const path = require('path')
const { pathToFileURL, fileURLToPath } = require('url')
const resolveModule = require('bare-module-resolve')
const resolveAddon = require('bare-addon-resolve')
const runtime = require('#runtime')

const builtinRequire = require

const host = `${runtime.platform}-${runtime.arch}${runtime.simulator ? '-simulator' : ''}`

const isWindows = runtime.platform === 'win32'

module.exports = function evaluate (bundle) {
  return load(bundle, Object.create(null), new URL(bundle.main))
}

function load (bundle, cache, url) {
  if (cache[url.href]) return cache[url.href].exports

  const filename = urlToPath(url)
  const dirname = urlToDirname(url)

  const module = cache[url.href] = {
    filename,
    dirname,
    exports: {}
  }

  if (url.protocol === 'builtin:') {
    module.exports = builtinRequire(url.pathname)

    return module
  }

  const source = bundle.read(url.href)

  if (source === null) throw new Error(`Cannot find module '${url.href}'`)

  function require (specifier) {
    return load(bundle, cache, resolve(bundle, specifier, url)).exports
  }

  require.main = urlToPath(bundle.main)
  require.cache = cache

  require.resolve = function (specifier, parentURL = url) {
    return urlToPath(resolve(bundle, specifier, toURL(parentURL, url)))
  }

  require.addon = function (specifier = '.', parentURL = url) {
    return addon(bundle, specifier, toURL(parentURL, url))
  }

  require.addon.host = host

  require.asset = function (specifier, parentURL = url) {
    return urlToPath(asset(bundle, specifier, toURL(parentURL, url)))
  }

  if (path.extname(url.href) === '.json') module.exports = JSON.parse(source)
  else {
    const fn = new Function('require', 'module', 'exports', '__filename', '__dirname', source) // eslint-disable-line no-new-func

    fn(
      require,
      module,
      module.exports,
      module.filename,
      module.dirname
    )
  }

  return module
}

function resolve (bundle, specifier, parentURL) {
  for (const resolved of resolveModule(specifier, parentURL, {
    resolutions: bundle.resolutions,
    builtins: runtime.builtins,
    conditions: ['require', ...runtime.conditions],
    extensions: runtime.extensions.module
  }, readPackage.bind(null, bundle))) {
    if (resolved.protocol === 'builtin:' || bundle.exists(resolved.href)) return resolved
  }

  throw new Error(`Cannot find module '${specifier}' imported from '${parentURL.href}'`)
}

function addon (bundle, specifier, parentURL) {
  for (const resolved of resolveAddon(specifier, parentURL, {
    host,
    resolutions: bundle.resolutions,
    conditions: ['addon', ...runtime.conditions],
    extensions: runtime.extensions.addon
  }, readPackage.bind(null, bundle))) {
    if (resolved.protocol === 'file:') {
      try {
        return builtinRequire(fileURLToPath(resolved))
      } catch {
        continue
      }
    }
  }

  throw new Error(`Cannot find addon '${specifier}' imported from '${parentURL.href}'`)
}

function asset (bundle, specifier, parentURL) {
  for (const resolved of resolveModule(specifier, parentURL, {
    resolutions: bundle.resolutions,
    builtins: runtime.builtins,
    conditions: ['asset', ...runtime.conditions]
  }, readPackage.bind(null, bundle))) {
    if (resolved.protocol === 'file:') return resolved
  }

  throw new Error(`Cannot find asset '${specifier}' imported from '${parentURL.href}'`)
}

function readPackage (bundle, url) {
  const source = bundle.read(url.href)

  if (source === null) return null

  try {
    return JSON.parse(source)
  } catch {
    return null
  }
}

function toURL (value, base) {
  if (typeof value === 'object' && value !== null) return value

  if (resolveModule.startsWithWindowsDriveLetter(value)) {
    return pathToFileURL(value)
  }

  try {
    return new URL(value, base)
  } catch {
    return pathToFileURL(value)
  }
}

function urlToPath (url) {
  if (url.protocol === 'file:') return fileURLToPath(url)
  if (url.protocol === 'builtin:') return url.pathname

  if (isWindows) {
    if (/%2f|%5c/i.test(url.pathname)) {
      throw new Error('The URL path must not include encoded \\ or / characters')
    }
  } else {
    if (/%2f/i.test(url.pathname)) {
      throw new Error('The URL path must not include encoded / characters')
    }
  }

  return decodeURIComponent(url.pathname)
}

function urlToDirname (url) {
  if (url.protocol === 'file:') return path.dirname(fileURLToPath(url))
  if (url.protocol === 'builtin:') return '.'

  if (isWindows) {
    if (/%2f|%5c/i.test(url.pathname)) {
      throw new Error('The URL path must not include encoded \\ or / characters')
    }
  } else {
    if (/%2f/i.test(url.pathname)) {
      throw new Error('The URL path must not include encoded / characters')
    }
  }

  return decodeURIComponent((new URL('.', url)).pathname).replace(/\/$/, '')
}
