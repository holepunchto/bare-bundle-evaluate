const test = require('brittle')
const path = require('path')
const { pathToFileURL } = require('url')
const Bundle = require('bare-bundle')
const evaluate = require('.')
const runtime = require('#runtime')

test('require(\'id\')', (t) => {
  const bundle = new Bundle()
    .write('/foo.js', 'module.exports = require(\'./bar\')', {
      main: true
    })
    .write('/bar.js', 'module.exports = 42')

  t.is(evaluate(bundle.mount(pathToFileURL('./test.bundle/'))).exports, 42)
})

test('circular require(\'id\')', (t) => {
  const bundle = new Bundle()
    .write('/foo.js', 'module.exports = require(\'./bar\')', {
      main: true
    })
    .write('/bar.js', 'module.exports = 42; require(\'./foo\')')

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

test('require.addon(\'id\')', (t) => {
  const bundle = new Bundle()
    .write('/binding.js', 'module.exports = require.addon(\'.\')', {
      main: true
    })
    .write('/package.json', '{ "name": "addon", "addon": true }')

  t.is(evaluate(bundle.mount(pathToFileURL('./test/fixtures/addon/test.bundle/'))).exports, 42)
})

test('require.addon(\'id\', referrer)', (t) => {
  const bundle = new Bundle()
    .write('/a/binding.js', 'module.exports = require(\'../b\')(\'.\', __filename)', {
      main: true
    })
    .write('/a/package.json', '{ "name": "addon", "addon": true }')
    .write('/b/index.js', 'module.exports = (specifier, referrer) => require.addon(specifier, referrer)')

  t.alike(evaluate(bundle.mount(pathToFileURL('./test/fixtures/addon/test.bundle/'))).exports, 42)
})

test('require.addon.resolve()', (t) => {
  const bundle = new Bundle()
    .write('/binding.js', 'module.exports = require.addon.resolve()', {
      main: true
    })
    .write('/package.json', '{ "name": "addon", "addon": true }')

  const resolved = evaluate(bundle.mount(pathToFileURL('./test/fixtures/addon/test.bundle/'))).exports

  t.comment(resolved)
  t.is(typeof resolved, 'string')
})

test('require.addon.resolve(\'id\')', (t) => {
  const bundle = new Bundle()
    .write('/binding.js', 'module.exports = require.addon.resolve(\'.\')', {
      main: true
    })
    .write('/package.json', '{ "name": "addon", "addon": true }')

  const resolved = evaluate(bundle.mount(pathToFileURL('./test/fixtures/addon/test.bundle/'))).exports

  t.comment(resolved)
  t.is(typeof resolved, 'string')
})

test('require.addon.resolve(\'id\', referrer)', (t) => {
  const bundle = new Bundle()
    .write('/a/binding.js', 'module.exports = require(\'../b\')(\'.\', __filename)', {
      main: true
    })
    .write('/a/package.json', '{ "name": "addon", "addon": true }')
    .write('/b/index.js', 'module.exports = (specifier, referrer) => require.addon.resolve(specifier, referrer)')

  const resolved = evaluate(bundle.mount(pathToFileURL('./test/fixtures/addon/test.bundle/'))).exports

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

test('require.asset(\'id\')', (t) => {
  const bundle = new Bundle()
    .write('/foo.js', 'module.exports = require.asset(\'./bar.txt\')', {
      main: true
    })

  t.is(evaluate(bundle.mount(pathToFileURL('./test.bundle/'))).exports, path.resolve('./test.bundle/bar.txt'))
})

test('require.asset(\'id\', referrer)', (t) => {
  const bundle = new Bundle()
    .write('/a/foo.js', 'module.exports = require(\'../b\')(\'./bar.txt\', __filename)', {
      main: true
    })
    .write('/b/index.js', 'module.exports = (specifier, referrer) => require.asset(specifier, referrer)')

  t.is(evaluate(bundle.mount(pathToFileURL('./test.bundle/'))).exports, path.resolve('./test.bundle/a/bar.txt'))
})

test('require.asset(\'id\'), preresolved', (t) => {
  const bundle = new Bundle()
    .write('/foo.js', 'module.exports = require.asset(\'./bar.txt\')', {
      main: true,
      imports: {
        './bar.txt': {
          asset: '/../bar.txt'
        }
      }
    })

  t.is(evaluate(bundle.mount(pathToFileURL('./test.bundle/'))).exports, path.resolve('./bar.txt'))
})

test('require(\'builtin\')', { skip: runtime.id !== 'node' }, (t) => {
  const bundle = new Bundle()
    .write('/foo.js', 'module.exports = require(\'fs\')', {
      main: true
    })

  t.is(evaluate(bundle.mount(pathToFileURL('./test.bundle/'))).exports, require('fs'))
})
