const path = require('path')
const { pathToFileURL, fileURLToPath } = require('url')
const resolveModule = require('bare-module-resolve')
const resolveAddon = require('bare-addon-resolve')
const defaultRuntime = require('bare-bundle-evaluate/runtime')

const builtinRequire = require

module.exports = function evaluate(bundle, runtime = defaultRuntime) {
  return load(bundle, runtime, Object.create(null), new URL(bundle.main))
}

function load(bundle, runtime, cache, url) {
  if (cache[url.href]) return cache[url.href].exports

  const filename = urlToPath(url, runtime)
  const dirname = urlToDirname(url, runtime)

  const module = (cache[url.href] = {
    filename,
    dirname,
    exports: {}
  })

  if (url.protocol === 'builtin:') {
    module.exports = builtinRequire(url.pathname)

    return module
  }

  const source = bundle.read(url.href)

  if (source === null) throw new Error(`Cannot find module '${url.href}'`)

  function require(specifier) {
    return load(
      bundle,
      runtime,
      cache,
      resolve(bundle, runtime, specifier, url)
    ).exports
  }

  require.main = urlToPath(bundle.main, runtime)
  require.cache = cache

  require.resolve = function (specifier, parentURL = url) {
    return urlToPath(
      resolve(bundle, runtime, specifier, toURL(parentURL, url)),
      runtime
    )
  }

  require.addon = function (specifier = '.', parentURL = url) {
    return builtinRequire(
      urlToPath(
        addon(bundle, runtime, specifier, toURL(parentURL, url)),
        runtime
      )
    )
  }

  require.addon.host = runtime.host

  require.addon.resolve = function (specifier = '.', parentURL = url) {
    return urlToPath(
      addon(bundle, runtime, specifier, toURL(parentURL, url)),
      runtime
    )
  }

  require.asset = function (specifier, parentURL = url) {
    return urlToPath(
      asset(bundle, runtime, specifier, toURL(parentURL, url)),
      runtime
    )
  }

  if (path.extname(url.href) === '.json') module.exports = JSON.parse(source)
  else {
    const fn = new Function(
      'require',
      'module',
      'exports',
      '__filename',
      '__dirname',
      source
    )

    fn(require, module, module.exports, module.filename, module.dirname)
  }

  return module
}

function resolve(bundle, runtime, specifier, parentURL) {
  for (const resolved of resolveModule(
    specifier,
    parentURL,
    {
      resolutions: bundle.resolutions,
      builtins: runtime.builtins,
      conditions: ['require', ...runtime.conditions],
      extensions: runtime.extensions.module,
      engines: runtime.versions
    },
    readPackage.bind(null, bundle)
  )) {
    if (resolved.protocol === 'builtin:' || bundle.exists(resolved.href))
      return resolved
  }

  throw new Error(
    `Cannot find module '${specifier}' imported from '${parentURL.href}'`
  )
}

function addon(bundle, runtime, specifier, parentURL) {
  for (const resolved of resolveAddon(
    specifier,
    parentURL,
    {
      host: runtime.host,
      resolutions: bundle.resolutions,
      conditions: ['addon', ...runtime.conditions],
      extensions: runtime.extensions.addon,
      engines: runtime.versions
    },
    readPackage.bind(null, bundle)
  )) {
    if (resolved.protocol === 'file:') {
      try {
        builtinRequire(fileURLToPath(resolved))
      } catch {
        continue
      }

      return resolved
    }
  }

  throw new Error(
    `Cannot find addon '${specifier}' imported from '${parentURL.href}'`
  )
}

function asset(bundle, runtime, specifier, parentURL) {
  for (const resolved of resolveModule(
    specifier,
    parentURL,
    {
      resolutions: bundle.resolutions,
      builtins: runtime.builtins,
      conditions: ['asset', ...runtime.conditions],
      engines: runtime.versions
    },
    readPackage.bind(null, bundle)
  )) {
    if (resolved.protocol === 'file:') return resolved
  }

  throw new Error(
    `Cannot find asset '${specifier}' imported from '${parentURL.href}'`
  )
}

function readPackage(bundle, url) {
  const source = bundle.read(url.href)

  if (source === null) return null

  try {
    return JSON.parse(source)
  } catch {
    return null
  }
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
      throw new Error(
        'The URL path must not include encoded \\ or / characters'
      )
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
      throw new Error(
        'The URL path must not include encoded \\ or / characters'
      )
    }
  } else {
    if (/%2f/i.test(url.pathname)) {
      throw new Error('The URL path must not include encoded / characters')
    }
  }

  return decodeURIComponent(new URL('.', url).pathname).replace(/\/$/, '')
}
