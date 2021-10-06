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

| option         | type                     | default                       | description                                                                                                                               |
|----------------|--------------------------|-------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| outputFilename | `string`                 | `chunk_sizes.txt`             | Report file name.                                                                                                                         |
| outputFolder   | `string`                 | Webpack's config output.path. | Report destination folder.                                                                                                                |
| overwrite      | `boolean`                | `true`                        | Overwrite file on report generation.                                                                                                      |
| customLabels   | `Record<string, string>` | `{}`                          | Additional custom labels in format: { labelName1: value1, labelName2: value2 }. <br>Values will be appended in every entry's labels list. |
| metricName     | `string`                 | `chunk_size_<unit name>`      | Metric custom name. <br>Default example: for unit = `kb` metric name will be `chunk_size_kilobytes`.                                      |
| chunkLabelName | `string`                 | `chunk`                       | Chunk label name.                                                                                                                         |
| unit           | `mb`, `kb`, `B`          | `kb`                          | Units for metric output. Supported values: <br>- `mb` (megabytes) <br>- `kb` (kilobytes) <br>- `B` (bytes)                                |


### Chunks labels

For chunk name definition webpack uses entry's property name by default. `main` will be used by default if this name is missing.
This can lead to metrics duplication in case of several webpack configurations in one build.

Possible solutions:

- Set up names for all entries
- Use `customLabels` parameter

### Report file

Plugin will overwrite report file on every run by default. In case of several webpack configurations 
in one build use `overwrite = false` and remove report file before next build manually.

#### Report file example

```text
chunk_size_kilobytes{bundle="someOtherPageBundle",chunk="myFavoriteChunk"} 0.08
chunk_size_kilobytes{customLabel="custom-value",bundle="mainPageBundle",chunk="main"} 2.88
chunk_size_kilobytes{customLabel="custom-value",bundle="mainPageBundle",chunk="chunkTwo"} 0.09
chunk_size_kilobytes{customLabel="custom-value",bundle="mainPageBundle",chunk="chunkOne"} 0.09
```

## Contributing

Follow [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
