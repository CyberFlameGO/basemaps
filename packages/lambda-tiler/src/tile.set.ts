import {
  ConfigTileSetRaster,
  ConfigTileSetVector,
  TileSetNameComponents,
  TileSetNameParser,
  TileSetType,
} from '@basemaps/config';
import { TileMatrixSet } from '@basemaps/geo';
import { LambdaHttpRequest, LambdaHttpResponse } from '@linzjs/lambda';
import { TileDataXyz } from '@basemaps/shared';
import { TileSets } from './tile.set.cache.js';
import { TileSetRaster } from './tile.set.raster.js';
import { TileSetVector } from './tile.set.vector.js';

export type TileSet = TileSetVector | TileSetRaster;

export abstract class TileSetHandler<T extends ConfigTileSetRaster | ConfigTileSetVector> {
  type: TileSetType;
  components: TileSetNameComponents;
  tileMatrix: TileMatrixSet;
  tileSet: T;
  constructor(name: string, tileMatrix: TileMatrixSet) {
    this.components = TileSetNameParser.parse(name);
    this.tileMatrix = tileMatrix;
  }

  get id(): string {
    return TileSets.id(this.fullName, this.tileMatrix);
  }

  get fullName(): string {
    return TileSetNameParser.componentsToName(this.components);
  }

  isVector(): this is TileSetVector {
    return this.type === TileSetType.Vector;
  }

  isRaster(): this is TileSetRaster {
    return this.type === TileSetType.Raster;
  }

  abstract tile(req: LambdaHttpRequest, xyz: TileDataXyz): Promise<LambdaHttpResponse>;
}
