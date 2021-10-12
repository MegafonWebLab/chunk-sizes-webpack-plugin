const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { ChunkSizesWebpackPlugin } = require('../lib');

const METRICS_FILE_NAME = 'metrics.txt';
const EXAMPLE_DIRECTORY = path.resolve('./example');

module.exports = [
    {
        context: EXAMPLE_DIRECTORY,
        entry: './src/index.js',
        mode: 'production',
        output: {
            filename: '[name].bundle.js',
            path: path.resolve(__dirname, 'dist'),
        },
        plugins: [
            new ChunkSizesWebpackPlugin({
                outputFilename: METRICS_FILE_NAME,
                overwrite: false,
                customLabels: {
                    customLabel: 'custom-value',
                    bundle: 'mainPageBundle',
                },
                unit: 'B',
            }),
        ],
    }, {
        context: EXAMPLE_DIRECTORY,
        entry: {
            myFavoriteEntry: './src/index2.js'
        },
        mode: 'production',
        output: {
            filename: '[name].bundle.js',
            path: path.resolve(__dirname, 'dist'),
        },
        module: {
            rules: [
                {
                    test: /\.css$/,
                    use: [
                        {
                            loader: MiniCssExtractPlugin.loader,
                        },
                        {
                            loader: 'css-loader',
                        },
                    ],
                },
            ],
        },
        plugins: [
            new ChunkSizesWebpackPlugin({
                outputFilename: METRICS_FILE_NAME,
                metricName: 'custom_metric_name',
                overwrite: false,
                customLabels: {
                    bundle: 'someOtherPageBundle',
                },
            }),
            new MiniCssExtractPlugin(),
        ],
    }
];
