# bare-bundle-evaluate

Evaluate a bundle of CommonJS modules across JavaScript runtimes.

```
npm i bare-bundle-evaluate
```

## Usage

```js
const Bundle = require('bare-bundle')
const evaluate = require('bare-bundle-evaluate')

const bundle = new Bundle()
  .write('/foo.js', "module.exports = require('./bar')", {
    main: true
  })
  .write('/bar.js', 'module.exports = 42')
  .mount(new URL(__dirname, 'file://'))

evaluate(bundle).exports
// 42
```

## API

#### `const module = evaluate(bundle[, runtime][, builtinRequire])`

## License

Apache-2.0
