import fs from 'fs';
import { ChunkSizesWebpackPlugin, ChunkSize, ChunkSizesWebpackPluginOptions } from './index';
import { AssetInfo, Chunk, Compilation, Stats } from 'webpack';

describe('ChunkSizesWebpackPlugin', () => {
    describe('getMetricName', () => {
        it('should return appropriate value for bytes', () => {
            const instance = new ChunkSizesWebpackPlugin({
                unit: 'B',
            });

            const name = instance.getMetricName();

            expect(name).toEqual('chunk_size_bytes');
        });

        it('should return appropriate value for kilobytes', () => {
            const instance = new ChunkSizesWebpackPlugin({
                unit: 'kb',
            });

            const name = instance.getMetricName();

            expect(name).toEqual('chunk_size_kilobytes');
        });

        it('should return appropriate value for megabytes', () => {
            const instance = new ChunkSizesWebpackPlugin({
                unit: 'mb',
            });

            const name = instance.getMetricName();

            expect(name).toEqual('chunk_size_megabytes');
        });

        it('should return custom name when it\'s defined', () => {
            const instance = new ChunkSizesWebpackPlugin({
                metricName: 'custom',
            });

            const name = instance.getMetricName();

            expect(name).toEqual('custom');
        });
    });

    describe('getSizeInUnit', () => {
        it('should return appropriate value for bytes', () => {
            const instance = new ChunkSizesWebpackPlugin({
                unit: 'B',
            });

            const size = instance.getSizeInUnit(999);

            expect(size).toEqual('999');
        });

        it('should return appropriate value for kilobytes', () => {
            const instance = new ChunkSizesWebpackPlugin({
                unit: 'kb',
            });

            const size = instance.getSizeInUnit(1024);

            expect(size).toEqual('1.00');
        });

        it('should return appropriate value for megabytes', () => {
            const instance = new ChunkSizesWebpackPlugin({
                unit: 'mb',
            });

            const size = instance.getSizeInUnit(1024 * 1024 * 1.5);

            expect(size).toEqual('1.50');
        });
    });

    describe('convertToOpenMetrics', () => {
        const chunk: ChunkSize = {
            sizeInBytes: 1024,
            name: 'name',
        }

        it('should convert empty array', () => {
            const instance = new ChunkSizesWebpackPlugin();

            const metrics = instance.convertToOpenMetrics([]);

            expect(metrics).toEqual('');
        });

        it('should convert simple chunk with defaults', () => {
            const instance = new ChunkSizesWebpackPlugin();

            const metrics = instance.convertToOpenMetrics([chunk]);

            expect(metrics).toEqual('chunk_size_kilobytes{chunk="name"} 1.00\n');
        });

        it('should convert simple chunks array', () => {
            const instance = new ChunkSizesWebpackPlugin();

            const chunk2: ChunkSize = {
                name: 'name2',
                sizeInBytes: 2048,
            }

            const metrics = instance.convertToOpenMetrics([chunk, chunk2]);

            expect(metrics).toEqual('chunk_size_kilobytes{chunk="name"} 1.00\nchunk_size_kilobytes{chunk="name2"} 2.00\n');
        });

        it('should convert simple chunk with custom metric name', () => {
            const instance = new ChunkSizesWebpackPlugin({
                metricName: 'custom'
            });

            const metrics = instance.convertToOpenMetrics([chunk]);

            expect(metrics).toEqual('custom{chunk="name"} 1.00\n');
        });

        it('should convert simple chunk with bytes unit', () => {
            const instance = new ChunkSizesWebpackPlugin({
                unit: 'B'
            });

            const metrics = instance.convertToOpenMetrics([chunk]);

            expect(metrics).toEqual('chunk_size_bytes{chunk="name"} 1024\n');
        });

        it('should convert simple chunk with custom labels', () => {
            const instance = new ChunkSizesWebpackPlugin({
                customLabels: {
                    custom1: 'one',
                    custom2: 'two',
                }
            });

            const metrics = instance.convertToOpenMetrics([chunk]);

            expect(metrics).toEqual('chunk_size_kilobytes{custom1="one",custom2="two",chunk="name"} 1.00\n');
        });
    });

    describe('getChunksSizes', () => {
        it('should get chunks sizes from assets for webpack 4 in sorted order', () => {
            const instance = new ChunkSizesWebpackPlugin();

            const chunks = new Set<Chunk>([
                {
                    id: '111',
                    files: new Set(['file1.js', 'file2.css']),
                },
                {
                    id: 222,
                    files: new Set(['file1.js']),
                },
                {
                    name: '333',
                    files: new Set(['file2.css']),
                }
            ] as unknown as Chunk[]);

            const assets = {
                ['file1.js']: {
                    size: () => 300,
                },
                ['file2.css']: {
                    size: () => 400,
                }
            } as unknown as Compilation['assets'];

            const sizes = instance.getChunksSizes(chunks, undefined, assets);

            expect(sizes).toEqual([
                {
                    name: '111',
                    sizeInBytes: 700,
                },
                {
                    name: '333',
                    sizeInBytes: 400,
                },
                {
                    name: '222',
                    sizeInBytes: 300,
                },
            ]);
        });

        it('should get chunks sizes from assetsInfo for webpack 5 in sorted order', () => {
            const instance = new ChunkSizesWebpackPlugin();

            const chunks = new Set<Chunk>([
                {
                    id: '111',
                    files: new Set(['file1.js', 'file2.css']),
                },
                {
                    id: 222,
                    files: new Set(['file1.js']),
                },
                {
                    name: '333',
                    files: new Set(['file2.css']),
                }
            ] as unknown as Chunk[]);

            const assetsInfo: Map<string, AssetInfo> = new Map([
                ['file1.js', { size: 300 }],
                ['file2.css', { size: 400 }],
            ]);

            const sizes = instance.getChunksSizes(chunks, assetsInfo);

            expect(sizes).toEqual([
                {
                    name: '111',
                    sizeInBytes: 700,
                },
                {
                    name: '333',
                    sizeInBytes: 400,
                },
                {
                    name: '222',
                    sizeInBytes: 300,
                },
            ]);
        });
    });

    describe('tapFunction', () => {
        const stats = { compilation: { chunks: [], assetsInfo: {}, assets: [] } } as unknown as Stats;

        let writeFileSpy: jest.SpyInstance, appendFileSpy: jest.SpyInstance;

        const createPluginInstance = (params?: Partial<ChunkSizesWebpackPluginOptions>): ChunkSizesWebpackPlugin => {
            const instance = new ChunkSizesWebpackPlugin(params);

            const getChunksSizesSpy = jest.spyOn(instance, 'getChunksSizes');
            getChunksSizesSpy.mockReturnValue([]);

            const convertToOpenMetricsSpy = jest.spyOn(instance, 'convertToOpenMetrics');
            convertToOpenMetricsSpy.mockReturnValue('converted');

            return instance;
        };

        beforeEach(() => {
            writeFileSpy = jest.spyOn(fs, 'writeFile');
            appendFileSpy = jest.spyOn(fs, 'appendFile');

            writeFileSpy.mockImplementation(() => {});
            appendFileSpy.mockImplementation(() => {});
        });

        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should write metrics with defaults', () => {
            const instance = createPluginInstance();

            instance.tapFunction(stats, () => {});

            expect(writeFileSpy).toBeCalled();
            expect(appendFileSpy).not.toBeCalled();
            expect(writeFileSpy.mock.calls[0][0]).toBe('chunk_sizes.txt');
            expect(writeFileSpy.mock.calls[0][1]).toBe('converted');
        });

        it('should write metrics with custom output folder', () => {
            const instance = createPluginInstance({
                outputFolder: 'custom',
            });

            instance.tapFunction(stats, () => {});

            expect(writeFileSpy).toBeCalled();
            expect(writeFileSpy.mock.calls[0][0]).toBe('custom/chunk_sizes.txt');
        });

        it('should write metrics with output folder from webpack config output path', () => {
            const instance = createPluginInstance();

            const customStats = {
                ...stats,
                compilation: {
                    options: {
                        output: {
                            path: 'custom-path'
                        }
                    },
                },
            } as Stats;

            instance.tapFunction(customStats, () => {});

            expect(writeFileSpy).toBeCalled();
            expect(writeFileSpy.mock.calls[0][0]).toBe('custom-path/chunk_sizes.txt');
        });

        it('should write metrics with custom output folder and filename', () => {
            const instance = createPluginInstance({
                outputFolder: 'custom',
                outputFilename: 'my-file-name.text'
            });

            instance.tapFunction(stats, () => {});

            expect(writeFileSpy).toBeCalled();
            expect(writeFileSpy.mock.calls[0][0]).toBe('custom/my-file-name.text');
        });

        it('should write metrics to the same file', () => {
            const instance = createPluginInstance({
                overwrite: false,
            });

            instance.tapFunction(stats, () => {});

            expect(writeFileSpy).not.toBeCalled();
            expect(appendFileSpy).toBeCalled();
            expect(appendFileSpy.mock.calls[0][0]).toBe('chunk_sizes.txt');
            expect(appendFileSpy.mock.calls[0][1]).toBe('converted');
        });
    });
});
