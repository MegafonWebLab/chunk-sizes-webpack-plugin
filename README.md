# ChunkSizesWebpackPlugin

Webpack plugin for collecting and reporting chunks sizes in OpenMetrics format. Applicable for 
[gitlab metrics feature](https://docs.gitlab.com/ee/ci/metrics_reports.html). 

Plugin supports webpack 4 and webpack 5.

## Usage

### Installation

```shell
$ yarn add -D chunk-sizes-webpack-plugin
```

### Webpack configuration

```js
const { ChunkSizesWebpackPlugin } = require('chunk-sizes-webpack-plugin');

module.exports = [
    {
        ...,
        plugins: [
            new ChunkSizesWebpackPlugin(),
        ],
    }
];
```

### Plugin options

All parameters are optional.

| option         | type                     | default                       | description                                                                                                                                 |
|----------------|--------------------------|-------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------|
| outputFilename | `string`                 | `chunk_sizes.txt`             | Report file name.                                                                                                                           |
| outputFolder   | `string`                 | Webpack's config output.path. | Report destination folder.                                                                                                                  |
| overwrite      | `boolean`                | `true`                        | Overwrite file on report generation.                                                                                                        |
| customLabels   | `Record<string, string>` | `{}`                          | Additional custom labels in format: `{ labelName1: value1, labelName2: value2 }`. <br>Values will be appended in every entry's labels list. |
| metricName     | `string`                 | `chunk_size_<unit name>`      | Metric custom name. <br>Default example: for unit = `kb` metric name will be `chunk_size_kilobytes`.                                        |
| chunkLabelName | `string`                 | `chunk`                       | Chunk label name.                                                                                                                           |
| unit           | `mb`, `kb`, `B`          | `kb`                          | Units for metric output. Supported values: <br>- `mb` (megabytes) <br>- `kb` (kilobytes) <br>- `B` (bytes)                                  |


### Chunks labels

For chunk name definition webpack uses entry's property name by default. `main` will be used by default if this name is missing.
This can lead to metrics duplication in case of several webpack configurations in one build.

Possible solutions:

- Set up names for all entries
- Use `customLabels` parameter

### Report file

Plugin will overwrite report file on every run by default. In case of several webpack configurations 
in one build use `overwrite = false` and remove report file before next build manually.

### Examples

Demo [configuration](https://github.com/MegafonWebLab/chunk-sizes-webpack-plugin/blob/master/example/webpack.config.js).

Includes two builds:
1. entry (main) with lazily-loaded modules (chunkOne and chunkTwo)
2. simple entry (myFavoriteEntry) 

* <b>Note: option `overwrite: false` should be added in every example bellow because of two builds in one config.</b> 

##### Defaults

```js
// for both entries
new ChunkSizesWebpackPlugin({
    overwrite: false,
})
```

```text
chunk_size_kilobytes{chunk="main"} 2.88
chunk_size_kilobytes{chunk="chunkTwo"} 0.09
chunk_size_kilobytes{chunk="chunkOne"} 0.09
chunk_size_kilobytes{chunk="myFavoriteEntry"} 0.08
```

##### With custom labels

```js
// main entry
new ChunkSizesWebpackPlugin({
    overwrite: false,
    customLabels: {
        customLabel: 'custom-value',
    },
})

// myFavoriteEntry
new ChunkSizesWebpackPlugin({
    overwrite: false,
    customLabels: {
        bundle: 'myFavoriteBundle',
    },
})

```

```text
chunk_size_kilobytes{bundle="myFavoriteBundle",chunk="myFavoriteEntry"} 0.08
chunk_size_kilobytes{customLabel="custom-value",chunk="main"} 2.88
chunk_size_kilobytes{customLabel="custom-value",chunk="chunkTwo"} 0.09
chunk_size_kilobytes{customLabel="custom-value",chunk="chunkOne"} 0.09
```

##### With custom metric name

```js
// for both entries
new ChunkSizesWebpackPlugin({
    overwrite: false,
    metricName: 'custom_metric_name',
})
```

```text
custom_metric_name{chunk="myFavoriteEntry"} 0.08
custom_metric_name{chunk="main"} 2.88
custom_metric_name{chunk="chunkTwo"} 0.09
custom_metric_name{chunk="chunkOne"} 0.09
```

##### With custom chunk label name

```js
// for both entries
new ChunkSizesWebpackPlugin({
    overwrite: false,
    chunkLabelName: 'particle',
})
```

```text
chunk_size_kilobytes{particle="myFavoriteEntry"} 0.08
chunk_size_kilobytes{particle="main"} 2.88
chunk_size_kilobytes{particle="chunkTwo"} 0.09
chunk_size_kilobytes{particle="chunkOne"} 0.09
```

##### With bytes in unit

```js
// for both entries
new ChunkSizesWebpackPlugin({
    overwrite: false,
    unit: 'B',
})
```

```text
chunk_size_bytes{chunk="myFavoriteEntry"} 81
chunk_size_bytes{chunk="main"} 2946
chunk_size_bytes{chunk="chunkTwo"} 93
chunk_size_bytes{chunk="chunkOne"} 92
```

## Contributing

Follow [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
