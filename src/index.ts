import fs from 'fs';
import path from 'path';
import { validate } from 'schema-utils';
import { Compiler, Stats, Chunk, AssetInfo } from 'webpack';
import { Schema } from 'schema-utils/declarations/validate';

const schema: Schema = {
    type: 'object',
    properties: {
        outputFilename: {
            type: 'string',
        },
        outputFolder: {
            type: 'string',
        },
        overwrite: {
            type: 'boolean',
        },
        customLabels: {
            type: 'object',
        },
        metricName: {
            type: 'string',
        },
        chunkLabelName: {
            type: 'string',
        },
        unit: {
            type: 'string',
            enum: ['mb', 'kb', 'B', 'bit'],
        },
    },
};

type ChunkSizesWebpackPluginOptions = {
    /**
     * Report file name.
     *
     * By default: `chunk_sizes.txt`.
     */
    outputFilename: string;
    /**
     * Report destination folder.
     *
     * By default: Webpack's config output.path.
     */
    outputFolder?: string;
    /**
     * Overwrite file on report generation.
     *
     * By default: `true`.
     */
    overwrite: boolean;
    /**
     * Additional custom labels in format: { labelName1: value1, labelName2: value2 }.
     * Values will be appended in every entry's labels list.
     */
    customLabels: Record<string, string>;
    /**
     * Metric custom name.
     *
     * By default: `chunk_size_<unit name>`.
     * For example, for unit = kb metric name will be `chunk_size_kilobytes`.
     */
    metricName?: string;
    /**
     * Chunk label name.
     *
     * By default: `chunk`.
     */
    chunkLabelName?: string;
    /**
     * Units for metric output.
     *
     * Supported values:
     * - `mb` (megabytes)
     * - `kb` (kilobytes)
     * - `B` (bytes)
     * - `bit` (bits)
     *
     * By default: `kb`.
     */
    unit: 'mb' | 'kb' | 'B' | 'bit';
}

type ChunkSize = {
    name: string;
    size: number;
}

export class ChunkSizesWebpackPlugin {
    static defaultOptions: ChunkSizesWebpackPluginOptions = {
        outputFilename: 'chunk_sizes.txt',
        outputFolder: undefined,
        overwrite: true,
        customLabels: {},
        metricName: undefined,
        chunkLabelName: 'chunk',
        unit: 'kb',
    };

    options: ChunkSizesWebpackPluginOptions;

    constructor(options: Partial<ChunkSizesWebpackPluginOptions> = {}) {
        const mergedOptions = { ...ChunkSizesWebpackPlugin.defaultOptions, ...options };

        validate(schema, mergedOptions, {
            name: ChunkSizesWebpackPlugin.name,
            baseDataPath: 'options',
        });

        this.options = mergedOptions;
    }

    getChunksSizes(chunks: Set<Chunk>, assetsInfo: Map<string, AssetInfo>): ChunkSize[] {
        return Array.from(chunks).reduce((accumulator: ChunkSize[], { id, name, files }) => {
            const chunkName = name || String(id);
            const chunkSizesSummary = Array.from(files).reduce((sum, fileName) => sum + (assetsInfo.get(fileName)?.size || 0), 0);

            accumulator.push({
                name: chunkName,
                size: chunkSizesSummary,
            });

            return accumulator;
        }, [])
        .sort((c1: ChunkSize, c2: ChunkSize) => c2.size - c1.size);
    }

    getMetricName() {
        if (this.options.metricName) {
            return this.options.metricName;
        }

        const prefix = 'chunk_size_';
        switch(this.options.unit) {
            case 'mb': {
                return `${prefix}megabytes`;
            }
            case 'kb': {
                return `${prefix}kilobytes`;
            }
            case 'B': {
                return `${prefix}bytes`;
            }
            default:
            case 'bit': {
                return `${prefix}bits`;
            }
        }
    }

    getSizeInUnit(size: number) {
        switch(this.options.unit) {
            case 'mb': {
                return (size / (1024 * 1024 * 8)).toFixed(2);
            }
            case 'kb': {
                return (size / (1024 * 8)).toFixed(2);
            }
            case 'B': {
                return (size / (8)).toFixed(2);
            }
            default:
            case 'bit': {
                return size;
            }
        }
    }

    convertToOpenMetrics(chunkSizes: ChunkSize[]): string {
        const metricName = this.getMetricName();
        const { chunkLabelName } = this.options;
        const customLabels = Object.entries(this.options.customLabels).map(([ label, value ]) => `${label}="${value}"`).join(',');

        return chunkSizes.reduce((acc, cur) => {
            const sizeInUnit = this.getSizeInUnit(cur.size);
            const labels = `${!customLabels ? '' : `${customLabels},`}${chunkLabelName}="${cur.name}"`;

            return `${acc}${metricName}{${labels}} ${sizeInUnit}\n`;
        }, '');
    }

    apply(compiler: Compiler) {
        const pluginName = ChunkSizesWebpackPlugin.name;

        compiler.hooks.done.tapAsync(pluginName, async (stats: Stats, callback) => {
                const { compilation: { chunks, assetsInfo } } = stats;

                const chunkSizes = this.getChunksSizes(chunks, assetsInfo);
                const converted = this.convertToOpenMetrics(chunkSizes);

                const outputFolder = this.options.outputFolder || stats.compilation.options.output.path || './';
                const outputFile = path.join(outputFolder, this.options.outputFilename);

                const writeFunction = this.options.overwrite ? fs.writeFile : fs.appendFile;

                writeFunction(outputFile, converted, err => {
                    if (err) {
                        console.error(err);
                    }

                    console.log('Chunk sizes metrics were written in', outputFile);

                    callback();
                });
            }
        );
    }
}
