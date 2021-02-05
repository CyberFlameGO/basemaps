import { FileOperator } from '@basemaps/shared';
import { TileSet } from '../tile.set';

export async function tryReadJson<T>(uri: string): Promise<T | null> {
    try {
        return await FileOperator.readJson<T>(uri);
    } catch (err) {
        if (FileOperator.isCompositeError(err) && err.code < 500) return null;
        throw err;
    }
}

/**
 * Load all the files from all the imagery inside of a tile set
 * @param tileSet tile set to lookup
 * @param filename file to get from imagery eg 'source.geojson'
 */
export function loadFilesFromTileSet<T>(tileSet: TileSet, filename: string): Map<string, Promise<T | null>> {
    const sourceFiles = new Map<string, Promise<T | null>>();
    for (const rule of tileSet.tileSet.rules) {
        const im = tileSet.imagery.get(rule.imgId);
        if (im == null) continue;
        if (sourceFiles.has(im.uri)) continue;
        sourceFiles.set(im.uri, tryReadJson(FileOperator.join(im.uri, filename)));
    }

    return sourceFiles;
}
