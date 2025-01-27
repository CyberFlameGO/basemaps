// Configure the logging before importing everything
import { ConfigPrefix, ConfigProvider, ConfigProviderMemory, parseRgba } from '@basemaps/config';
import { TileSetLocal } from '@basemaps/lambda-tiler/build/cli/tile.set.local.js';
import { TileSets } from '@basemaps/lambda-tiler/build/tile.set.cache.js';
import { Config, Env, LogConfig } from '@basemaps/shared';
import { fsa } from '@linzjs/s3fs';
import { Command, flags } from '@oclif/command';
import { basename, dirname } from 'path';
import { BasemapsServer } from './server.js';

const logger = LogConfig.get();

const BaseProvider: ConfigProvider = {
  id: 'pv_linz',
  version: 1,
  serviceIdentification: {},
  serviceProvider: {
    name: 'basemaps/server',
    contact: {
      address: {},
    },
  },
} as any;

export class BasemapsServerCommand extends Command {
  static description = 'Create a WMTS/XYZ Tile server for basemaps config';
  static flags = { verbose: flags.boolean(), port: flags.integer({ default: 5000 }) };

  static args = [{ name: 'configPath', required: true }];

  async run(): Promise<void> {
    const { args, flags } = this.parse(BasemapsServerCommand);
    if (flags.verbose) logger.level = 'debug';

    const ServerUrl = `http://localhost:${flags.port}`;
    // Force a default url base so WMTS requests know their relative url
    process.env[Env.PublicUrlBase] = process.env[Env.PublicUrlBase] ?? `http://localhost:${flags.port}`;

    logger.info({ path: args.configPath }, 'Starting Server');

    const config = new ConfigProviderMemory();
    Config.setConfigProvider(config);

    const tifSets = new Map<string, TileSetLocal>();

    for await (const file of fsa.listDetails(args.configPath)) {
      const lowerPath = file.path.toLowerCase();
      if (lowerPath.endsWith('.tiff') || lowerPath.endsWith('.tif')) {
        const tiffPath = dirname(file.path);
        if (tifSets.has(tiffPath)) continue;

        const tileSet = basename(tiffPath);
        const tsl = new TileSetLocal(tileSet, tiffPath);

        await tsl.load();
        TileSets.add(tsl, new Date('3000-01-01').getTime());

        const wmtsUrl = `${ServerUrl}/v1/tiles/${tileSet}/WMTSCapabilities.xml`;
        logger.info({ tileSetId: tileSet, wmtsUrl }, 'TileSet:Loaded');
        if (!config.objects.has('pv_linz')) config.put(BaseProvider);
      }

      if (!lowerPath.endsWith('.json')) continue;
      logger.trace({ path: file.path, size: file.size }, 'Config:Load');

      const jsonData = await fsa.read(file.path).then((c) => JSON.parse(c.toString()));
      if (jsonData.id == null) {
        logger.warn({ path: file.path }, 'Config:Invalid Missing "id"');
        continue;
      }
      // Last modified now, make sure its considered fresh
      jsonData.updatedAt = Date.now();
      // TODO we should really use something like zod to validate this
      config.put(jsonData);

      if (!Config.TileSet.is(jsonData) || !Config.isTileSetRaster(jsonData)) continue;
      if (typeof jsonData.background === 'string') jsonData.background = parseRgba(jsonData.background);

      const tileSet = Config.unprefix(ConfigPrefix.TileSet, jsonData.id);
      if (jsonData.name == null) jsonData.name = tileSet;
      const wmtsUrl = `${ServerUrl}/v1/tiles/${tileSet}/WMTSCapabilities.xml`;
      logger.info({ tileSetId: jsonData.id, wmtsUrl }, 'TileSet:Loaded');
    }

    BasemapsServer.listen(flags.port, () => {
      logger.info({ url: ServerUrl }, 'ServerStarted');
    });
  }
}
