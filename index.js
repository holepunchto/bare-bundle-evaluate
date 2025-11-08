const path = require('path')
const fs = require('fs')
const { pathToFileURL, fileURLToPath } = require('url')
const resolveModule = require('bare-module-resolve')
const resolveAddon = require('bare-addon-resolve')
const defaultRuntime = require('bare-bundle-evaluate/runtime')
const constants = require('./lib/constants')

if (typeof require.addon !== 'function') require.addon = require

module.exports = function evaluate(bundle, runtime, builtinRequire) {
  if (typeof runtime === 'function') {
    builtinRequire = runtime
    runtime = defaultRuntime
  } else if (typeof runtime !== 'object' || runtime === null) {
    runtime = defaultRuntime
  }

  if (typeof builtinRequire !== 'function') {
    builtinRequire = require
  }

  return load(Object.create(null), new URL(bundle.main))

  function load(cache, url, referrer = null, attributes = null) {
    const type = typeForAttributes(attributes)

    let module = cache[url.href] || null

    if (module !== null) {
      if (type !== 0 && type !== module.type) {
        throw new Error(`Module '${module.url.href}' is not of type '${nameOfType(type)}'`)
      }

      return module
    }

    const { imports, resolutions } = referrer || bundle

    const filename = urlToPath(url, runtime)
    const dirname = urlToDirname(url, runtime)

    module = cache[url.href] = {
      url,
      type,
      filename,
      dirname,
      imports,
      resolutions,
      main: null,
      exports: {}
    }

    if (url.protocol === 'builtin:') {
      module.exports = builtinRequire(url.pathname)

      return module
    }

    module.main = referrer ? referrer.main : module

    if (
      typeof attributes === 'object' &&
      attributes !== null &&
      typeof attributes.imports === 'string'
    ) {
      const resolved = resolve(attributes.imports, referrer)

      const imports = load(cache, resolved, module, { type: 'json' })

      module.imports = mixinImports(module.imports, imports.exports, resolved)
    }

    const source = bundle.read(url.href)

    if (source === null) throw new Error(`Cannot find module '${url.href}'`)

    function require(specifier, opts = {}) {
      const attributes = opts && opts.with

      return load(cache, resolve(specifier, module), module, attributes).exports
    }

    require.main = module.main
    require.cache = cache

    require.resolve = function (specifier, parentURL = url) {
      return urlToPath(resolve(specifier, toURL(parentURL, url)), runtime)
    }

    require.addon = function (specifier = '.', parentURL = url) {
      return builtinRequire.addon(
        urlToPath(addon(specifier, module, toURL(parentURL, url)), runtime)
      )
    }

    require.addon.host = runtime.host

    require.addon.resolve = function (specifier = '.', parentURL = url) {
      return urlToPath(addon(specifier, module, toURL(parentURL, url)), runtime)
    }

    require.asset = function (specifier, parentURL = url) {
      return urlToPath(asset(specifier, module, toURL(parentURL, url)), runtime)
    }

    const extension = canonicalExtensionForType(type) || path.extname(url.pathname)

    switch (extension) {
      case '.json':
        module.type = constants.JSON
        module.exports = JSON.parse(source)
        break
      case '.bin':
        module.type = constants.BINARY
        module.exports = source
        break
      case '.txt':
        module.type = constants.TEXT
        module.exports = source.toString()
        break
      case '.cjs':
      default:
        module.type = constants.SCRIPT

        const fn = new Function('require', 'module', 'exports', '__filename', '__dirname', source)

        fn(require, module, module.exports, module.filename, module.dirname)
    }

    return module
  }

  function resolve(specifier, referrer, parentURL = referrer.url) {
    for (const resolved of resolveModule(
      specifier,
      parentURL,
      {
        imports: referrer.imports,
        resolutions: referrer.resolutions,
        builtins: runtime.builtins,
        conditions: ['require', ...runtime.conditions],
        extensions: runtime.extensions.module,
        engines: runtime.versions
      },
      readPackage
    )) {
      if (resolved.protocol === 'builtin:' || bundle.exists(resolved.href)) {
        return resolved
      }
    }

    throw new Error(`Cannot find module '${specifier}' imported from '${parentURL.href}'`)
  }

  function addon(specifier, referrer, parentURL = referrer.url) {
    for (const resolved of resolveAddon(
      specifier,
      parentURL,
      {
        imports: referrer.imports,
        resolutions: referrer.resolutions,
        host: runtime.host,
        conditions: ['addon', ...runtime.conditions],
        extensions: runtime.extensions.addon,
        engines: runtime.versions
      },
      readPackage
    )) {
      if (resolved.protocol === 'file:' && fs.existsSync(fileURLToPath(resolved))) {
        return resolved
      }
    }

    throw new Error(`Cannot find addon '${specifier}' imported from '${parentURL.href}'`)
  }

  function asset(specifier, referrer, parentURL = referrer.url) {
    for (const resolved of resolveModule(
      specifier,
      parentURL,
      {
        imports: referrer.imports,
        resolutions: referrer.resolutions,
        builtins: runtime.builtins,
        conditions: ['asset', ...runtime.conditions],
        engines: runtime.versions
      },
      readPackage
    )) {
      if (resolved.protocol === 'file:' && fs.existsSync(fileURLToPath(resolved))) {
        return resolved
      }
    }

    throw new Error(`Cannot find asset '${specifier}' imported from '${parentURL.href}'`)
  }

  function readPackage(url) {
    const source = bundle.read(url.href)

    if (source === null) return null

    try {
      return JSON.parse(source)
    } catch {
      return null
    }
  }
}

function canonicalExtensionForType(type) {
  switch (type) {
    case constants.types.SCRIPT:
      return '.cjs'
    case constants.types.JSON:
      return '.json'
    case constants.types.BINARY:
      return '.bin'
    case constants.types.TEXT:
      return '.txt'
    default:
      return null
  }
}

function nameOfType(type) {
  switch (type) {
    case constants.types.SCRIPT:
      return 'script'
    case constants.types.JSON:
      return 'json'
    case constants.types.BINARY:
      return 'binary'
    case constants.types.TEXT:
      return 'text'
    default:
      return null
  }
}

function typeForAttributes(attributes) {
  if (typeof attributes !== 'object' || attributes === null) return 0

  switch (attributes.type) {
    case 'script':
      return constants.types.SCRIPT
    case 'json':
      return constants.types.JSON
    case 'binary':
      return constants.types.BINARY
    case 'text':
      return constants.types.TEXT
    default:
      return 0
  }
}

function mixinImports(target, imports, url) {
  if (typeof imports === 'object' && imports !== null && 'imports' in imports) {
    imports = imports.imports
  }

  if (typeof imports !== 'object' || imports === null) {
    throw new Error(`Imports map at '${url.href}' is not valid`)
  }

  return { ...target, ...imports }
}

function toURL(value, base) {
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

function urlToPath(url, runtime) {
  if (url.protocol === 'file:') return fileURLToPath(url)
  if (url.protocol === 'builtin:') return url.pathname

  const isWindows = runtime.platform === 'win32'

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

function urlToDirname(url, runtime) {
  if (url.protocol === 'file:') return path.dirname(fileURLToPath(url))
  if (url.protocol === 'builtin:') return '.'

  const isWindows = runtime.platform === 'win32'

  if (isWindows) {
    if (/%2f|%5c/i.test(url.pathname)) {
      throw new Error('The URL path must not include encoded \\ or / characters')
    }
  } else {
    if (/%2f/i.test(url.pathname)) {
      throw new Error('The URL path must not include encoded / characters')
    }
  }

  return decodeURIComponent(new URL('.', url).pathname).replace(/\/$/, '')
}
