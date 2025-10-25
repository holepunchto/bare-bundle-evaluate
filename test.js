const test = require('brittle')
const path = require('path')
const { pathToFileURL } = require('url')
const Bundle = require('bare-bundle')
const runtime = require('bare-bundle-evaluate/runtime')
const evaluate = require('.')

test("require('id')", (t) => {
  const bundle = new Bundle()
    .write('/foo.js', "module.exports = require('./bar')", {
      main: true
    })
    .write('/bar.js', 'module.exports = 42')

  t.is(evaluate(bundle.mount(pathToFileURL('./test.bundle/'))).exports, 42)
})

test("circular require('id')", (t) => {
  const bundle = new Bundle()
    .write('/foo.js', "module.exports = require('./bar')", {
      main: true
    })
    .write('/bar.js', "module.exports = 42; require('./foo')")

  t.is(evaluate(bundle.mount(pathToFileURL('./test.bundle/'))).exports, 42)
})

test("require('id'), preresolved", (t) => {
  const bundle = new Bundle()
    .write('/foo.js', "module.exports = require('./bar')", {
      main: true,
      imports: {
        './bar': '/baz.js'
      }
    })
    .write('/baz.js', 'module.exports = 42')

  t.is(evaluate(bundle.mount(pathToFileURL('./test.bundle/'))).exports, 42)
})

test("require('id'), globally preresolved", (t) => {
  const bundle = new Bundle()
    .write('/foo.js', "module.exports = require('./bar')", {
      main: true
    })
    .write('/baz.js', 'module.exports = 42')

  bundle.imports = {
    './bar': '/baz.js'
  }

  t.is(evaluate(bundle.mount(pathToFileURL('./test.bundle/'))).exports, 42)
})

test('require.addon()', (t) => {
  const bundle = new Bundle()
    .write('/binding.js', 'module.exports = require.addon()', {
      main: true
    })
    .write('/package.json', '{ "name": "addon", "addon": true }')

  t.alike(evaluate(bundle.mount(pathToFileURL('./test/fixtures/addon/test.bundle/'))).exports, 42)
})

test("require.addon('id')", (t) => {
  const bundle = new Bundle()
    .write('/binding.js', "module.exports = require.addon('.')", {
      main: true
    })
    .write('/package.json', '{ "name": "addon", "addon": true }')

  t.is(evaluate(bundle.mount(pathToFileURL('./test/fixtures/addon/test.bundle/'))).exports, 42)
})

test("require.addon('id', referrer)", (t) => {
  const bundle = new Bundle()
    .write('/a/binding.js', "module.exports = require('../b')('.', __filename)", {
      main: true
    })
    .write('/a/package.json', '{ "name": "addon", "addon": true }')
    .write(
      '/b/index.js',
      'module.exports = (specifier, referrer) => require.addon(specifier, referrer)'
    )

  t.alike(evaluate(bundle.mount(pathToFileURL('./test/fixtures/addon/test.bundle/'))).exports, 42)
})

test("require.addon('id'), preresolved", (t) => {
  const bundle = new Bundle()
    .write('/binding.js', "module.exports = require.addon('.')", {
      main: true,
      imports: {
        '.': {
          addon: {
            darwin: {
              arm64: {
                bare: '/../fixtures/addon/prebuilds/darwin-arm64/addon.bare',
                node: '/../fixtures/addon/prebuilds/darwin-arm64/addon.node'
              },
              x64: {
                bare: '/../fixtures/addon/prebuilds/darwin-x64/addon.bare',
                node: '/../fixtures/addon/prebuilds/darwin-x64/addon.node'
              }
            },
            linux: {
              arm64: {
                bare: '/../fixtures/addon/prebuilds/linux-arm64/addon.bare',
                node: '/../fixtures/addon/prebuilds/linux-arm64/addon.node'
              },
              x64: {
                bare: '/../fixtures/addon/prebuilds/linux-x64/addon.bare',
                node: '/../fixtures/addon/prebuilds/linux-x64/addon.node'
              }
            },
            win32: {
              arm64: {
                bare: '/../fixtures/addon/prebuilds/win32-arm64/addon.bare',
                node: '/../fixtures/addon/prebuilds/win32-arm64/addon.node'
              },
              x64: {
                bare: '/../fixtures/addon/prebuilds/win32-x64/addon.bare',
                node: '/../fixtures/addon/prebuilds/win32-x64/addon.node'
              }
            }
          }
        }
      }
    })
    .write('/package.json', '{ "name": "addon", "addon": true }')

  t.is(evaluate(bundle.mount(pathToFileURL('./test/test.bundle/'))).exports, 42)
})

test("require.addon('id', referrer), preresolved", (t) => {
  const bundle = new Bundle()
    .write('/a/binding.js', "module.exports = require('../b')('.', __filename)", {
      main: true,
      imports: {
        '.': {
          addon: {
            darwin: {
              arm64: {
                bare: '/../fixtures/addon/prebuilds/darwin-arm64/addon.bare',
                node: '/../fixtures/addon/prebuilds/darwin-arm64/addon.node'
              },
              x64: {
                bare: '/../fixtures/addon/prebuilds/darwin-x64/addon.bare',
                node: '/../fixtures/addon/prebuilds/darwin-x64/addon.node'
              }
            },
            linux: {
              arm64: {
                bare: '/../fixtures/addon/prebuilds/linux-arm64/addon.bare',
                node: '/../fixtures/addon/prebuilds/linux-arm64/addon.node'
              },
              x64: {
                bare: '/../fixtures/addon/prebuilds/linux-x64/addon.bare',
                node: '/../fixtures/addon/prebuilds/linux-x64/addon.node'
              }
            },
            win32: {
              arm64: {
                bare: '/../fixtures/addon/prebuilds/win32-arm64/addon.bare',
                node: '/../fixtures/addon/prebuilds/win32-arm64/addon.node'
              },
              x64: {
                bare: '/../fixtures/addon/prebuilds/win32-x64/addon.bare',
                node: '/../fixtures/addon/prebuilds/win32-x64/addon.node'
              }
            }
          }
        }
      }
    })
    .write('/a/package.json', '{ "name": "addon", "addon": true }')
    .write(
      '/b/index.js',
      'module.exports = (specifier, referrer) => require.addon(specifier, referrer)'
    )

  t.is(evaluate(bundle.mount(pathToFileURL('./test/test.bundle/'))).exports, 42)
})

test('require.addon.resolve()', (t) => {
  const bundle = new Bundle()
    .write('/binding.js', 'module.exports = require.addon.resolve()', {
      main: true
    })
    .write('/package.json', '{ "name": "addon", "addon": true }')

  const resolved = evaluate(
    bundle.mount(pathToFileURL('./test/fixtures/addon/test.bundle/'))
  ).exports

  t.comment(resolved)
  t.is(typeof resolved, 'string')
})

test("require.addon.resolve('id')", (t) => {
  const bundle = new Bundle()
    .write('/binding.js', "module.exports = require.addon.resolve('.')", {
      main: true
    })
    .write('/package.json', '{ "name": "addon", "addon": true }')

  const resolved = evaluate(
    bundle.mount(pathToFileURL('./test/fixtures/addon/test.bundle/'))
  ).exports

  t.comment(resolved)
  t.is(typeof resolved, 'string')
})

test("require.addon.resolve('id', referrer)", (t) => {
  const bundle = new Bundle()
    .write('/a/binding.js', "module.exports = require('../b')('.', __filename)", {
      main: true
    })
    .write('/a/package.json', '{ "name": "addon", "addon": true }')
    .write(
      '/b/index.js',
      'module.exports = (specifier, referrer) => require.addon.resolve(specifier, referrer)'
    )

  const resolved = evaluate(
    bundle.mount(pathToFileURL('./test/fixtures/addon/test.bundle/'))
  ).exports

  t.comment(resolved)
  t.is(typeof resolved, 'string')
})

test('require.addon.host', (t) => {
  const bundle = new Bundle()
    .write('/binding.js', 'module.exports = require.addon.host', {
      main: true
    })
    .write('/package.json', '{ "name": "addon", "addon": true }')

  const host = evaluate(bundle.mount(pathToFileURL('./test/fixtures/addon/test.bundle/'))).exports

  t.comment(host)
  t.is(typeof host, 'string')
})

test("require.asset('id')", (t) => {
  const bundle = new Bundle().write('/foo.js', "module.exports = require.asset('./bar.txt')", {
    main: true
  })

  t.is(
    evaluate(bundle.mount(pathToFileURL('./test.bundle/'))).exports,
    path.resolve('./test.bundle/bar.txt')
  )
})

test("require.asset('id', referrer)", (t) => {
  const bundle = new Bundle()
    .write('/a/foo.js', "module.exports = require('../b')('./bar.txt', __filename)", {
      main: true
    })
    .write(
      '/b/index.js',
      'module.exports = (specifier, referrer) => require.asset(specifier, referrer)'
    )

  t.is(
    evaluate(bundle.mount(pathToFileURL('./test.bundle/'))).exports,
    path.resolve('./test.bundle/a/bar.txt')
  )
})

test("require.asset('id'), preresolved", (t) => {
  const bundle = new Bundle().write('/foo.js', "module.exports = require.asset('./bar.txt')", {
    main: true,
    imports: {
      './bar.txt': {
        asset: '/../bar.txt'
      }
    }
  })

  t.is(evaluate(bundle.mount(pathToFileURL('./test.bundle/'))).exports, path.resolve('./bar.txt'))
})

test("require.asset('id', referrer), preresolved", (t) => {
  const bundle = new Bundle()
    .write('/a/foo.js', "module.exports = require('../b')('./bar.txt', __filename)", {
      main: true,
      imports: {
        './bar.txt': {
          asset: '/../bar.txt'
        }
      }
    })
    .write(
      '/b/index.js',
      'module.exports = (specifier, referrer) => require.asset(specifier, referrer)'
    )

  t.is(evaluate(bundle.mount(pathToFileURL('./test.bundle/'))).exports, path.resolve('./bar.txt'))
})

test("require('builtin')", (t) => {
  const [builtin = null] = runtime.builtins

  if (builtin === null) return t.pass('has no builtins')

  const bundle = new Bundle().write('/foo.js', `module.exports = require('${builtin}')`, {
    main: true
  })

  t.is(evaluate(bundle.mount(pathToFileURL('./test.bundle/'))).exports, require(builtin))
})

test("require('.json')", (t) => {
  const bundle = new Bundle()
    .write('/foo.js', "module.exports = require('./bar.json')", {
      main: true
    })
    .write('/bar.json', '{ "hello": "world" }')

  t.alike(evaluate(bundle.mount(pathToFileURL('./test.bundle/'))).exports, {
    hello: 'world'
  })
})

test("require('.bin')", (t) => {
  const bundle = new Bundle()
    .write('/foo.js', "module.exports = require('./bar.bin')", {
      main: true
    })
    .write('/bar.bin', 'Hello world')

  t.alike(
    evaluate(bundle.mount(pathToFileURL('./test.bundle/'))).exports,
    Buffer.from('Hello world')
  )
})

test("require('.txt')", (t) => {
  const bundle = new Bundle()
    .write('/foo.js', "module.exports = require('./bar.txt')", {
      main: true
    })
    .write('/bar.txt', 'Hello world')

  t.alike(evaluate(bundle.mount(pathToFileURL('./test.bundle/'))).exports, 'Hello world')
})

test("require('id', { with: { type: 'json' } })", (t) => {
  const bundle = new Bundle()
    .write('/foo.js', "module.exports = require('./bar', { with: { type: 'json' } })", {
      main: true
    })
    .write('/bar', '{ "hello": "world" }')

  t.alike(evaluate(bundle.mount(pathToFileURL('./test.bundle/'))).exports, {
    hello: 'world'
  })
})

test("require('id', { with: { type: 'binary' } })", (t) => {
  const bundle = new Bundle()
    .write('/foo.js', "module.exports = require('./bar', { with: { type: 'binary' } })", {
      main: true
    })
    .write('/bar', 'Hello world')

  t.alike(
    evaluate(bundle.mount(pathToFileURL('./test.bundle/'))).exports,
    Buffer.from('Hello world')
  )
})

test("require('id', { with: { type: 'text' } })", (t) => {
  const bundle = new Bundle()
    .write('/foo.js', "module.exports = require('./bar', { with: { type: 'text' } })", {
      main: true
    })
    .write('/bar', 'Hello world')

  t.is(evaluate(bundle.mount(pathToFileURL('./test.bundle/'))).exports, 'Hello world')
})

test("require('id', { with: { type: 'type' } }), asserted type mismatch", (t) => {
  const bundle = new Bundle()
    .write(
      '/foo.js',
      "require('./bar', { with: { type: 'text' } }); require('./bar', { with: { type: 'binary' } })",
      {
        main: true
      }
    )
    .write('/bar', 'Hello world')

  try {
    evaluate(bundle.mount(pathToFileURL('./test.bundle/')))
    t.fail()
  } catch (err) {
    t.comment(err.message)
  }
})

test("require('id', { with: { imports: 'specifier' } })", (t) => {
  const bundle = new Bundle()
    .write(
      '/foo.js',
      "module.exports = require('./bar.js', { with: { imports: './imports.json' } })",
      {
        main: true
      }
    )
    .write('/bar.js', "module.exports = require('baz')")
    .write('/baz.js', 'module.exports = 42')
    .write('/imports.json', '{ "baz": "./baz.js" }')

  t.is(evaluate(bundle.mount(pathToFileURL('./test.bundle/'))).exports, 42)
})
