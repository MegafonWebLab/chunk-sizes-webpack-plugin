import fs from 'fs';
import path from 'path';
import { validate } from 'schema-utils';
import { Compiler, Stats, Chunk, AssetInfo, Compilation } from 'webpack';
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
            enum: ['mb', 'kb', 'B'],
        },
    },
};

export type ChunkSizesWebpackPluginOptions = {
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
     *
     * By default: `kb`.
     */
    unit: 'mb' | 'kb' | 'B';
}

export type ChunkSize = {
    name: string;
    sizeInBytes: number;
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

    getChunksSizes(chunks: Set<Chunk>, assetsInfo?: Map<string, AssetInfo>, assets?: Compilation['assets']): ChunkSize[] {
        return Array.from(chunks).reduce((accumulator: ChunkSize[], { id, name, files }) => {
            const chunkName = name || String(id);
            const chunkSizesSummary = Array.from(files).reduce((sum, fileName) => {
                let fileSize = 0;

                // webpack 5
                if (assetsInfo?.get(fileName)?.size) {
                    fileSize = assetsInfo.get(fileName)?.size || 0;
                }

                // webpack 4
                if (!fileSize && assets?.[fileName]?.size?.()) {
                    fileSize = assets?.[fileName]?.size?.();
                }

                return sum + fileSize;
            }, 0);

            accumulator.push({
                name: chunkName,
                sizeInBytes: chunkSizesSummary,
            });

            return accumulator;
        }, [])
        .sort((c1: ChunkSize, c2: ChunkSize) => c2.sizeInBytes - c1.sizeInBytes);
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
            default: {
                return `${prefix}bytes`;
            }
        }
    }

    getSizeInUnit(sizeInBytes: number): string {
        switch(this.options.unit) {
            case 'mb': {
                return (sizeInBytes / (1024 * 1024)).toFixed(2);
            }
            case 'kb': {
                return (sizeInBytes / 1024).toFixed(2);
            }
            default: {
                return `${sizeInBytes}`;
            }
        }
    }

    convertToOpenMetrics(chunkSizes: ChunkSize[]): string {
        const metricName = this.getMetricName();
        const { chunkLabelName, customLabels } = this.options;
        const convertedCustomLabels = Object.entries(customLabels).map(([ label, value ]) => `${label}="${value}"`).join(',');

        return chunkSizes.reduce((acc, cur) => {
            const sizeInUnit = this.getSizeInUnit(cur.sizeInBytes);
            const labels = `${!convertedCustomLabels ? '' : `${convertedCustomLabels},`}${chunkLabelName}="${cur.name}"`;

            return `${acc}${metricName}{${labels}} ${sizeInUnit}\n`;
        }, '');
    }

    tapFunction(stats: Stats, callback: Function): void {
        const { compilation: { chunks, assetsInfo, assets } } = stats;

        const chunkSizes = this.getChunksSizes(chunks, assetsInfo, assets);
        const converted = this.convertToOpenMetrics(chunkSizes);

        const outputFolder = this.options.outputFolder || stats.compilation.options?.output?.path || './';
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

    apply(compiler: Compiler) {
        compiler.hooks.done.tapAsync(ChunkSizesWebpackPlugin.name, this.tapFunction);
    }
}

