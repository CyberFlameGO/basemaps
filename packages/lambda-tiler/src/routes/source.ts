import { HttpHeader, LambdaContext, LambdaHttpResponse } from '@basemaps/lambda';
import { setNameAndProjection, tileAttributionFromPath } from '@basemaps/shared';
import { toFeatureCollection } from '@linzjs/geojson';
import { TileSet } from '../tile.set';
import { loadTileSet } from '../tile.set.cache';
import { Responses } from './api';
import { loadFilesFromTileSet } from './imagery.files';

async function getSourceBounds(tileSet: TileSet): Promise<GeoJSON.FeatureCollection | null> {
    const allBounds = loadFilesFromTileSet<GeoJSON.FeatureCollection>(tileSet, 'source.geojson');
    let features: GeoJSON.Feature[] = [];

    for (const rule of tileSet.tileSet.rules) {
        const im = tileSet.imagery.get(rule.imgId);
        if (im == null) continue;
        const bounds = await allBounds.get(im.uri);
        if (bounds == null) continue;
        features = features.concat(bounds.features);
    }

    if (features.length > 0) return toFeatureCollection(features);
    return null;
}

/**
 * Create a LambdaHttpResponse for a attribution request
 */
export async function source(req: LambdaContext): Promise<LambdaHttpResponse> {
    const data = tileAttributionFromPath(req.action.rest);
    if (data == null) return Responses.NotFound;
    setNameAndProjection(req, data);

    req.timer.start('tileset:load');
    const tileSet = await loadTileSet(data.name, data.projection);
    req.timer.end('tileset:load');
    if (tileSet == null) return Responses.NotFound;

    const cacheKey = `v1.${tileSet.tileSet.version}`; // change version if format changes

    const ifNoneMatch = req.header(HttpHeader.IfNoneMatch);
    if (ifNoneMatch != null && ifNoneMatch.indexOf(cacheKey) > -1) {
        req.set('cache', { key: cacheKey, hit: true, match: ifNoneMatch });
        return Responses.NotModified;
    }

    req.timer.start('source:load');
    const sourceBounds = await getSourceBounds(tileSet);
    req.timer.end('source:load');

    if (sourceBounds == null) return Responses.NotFound;

    const response = new LambdaHttpResponse(200, 'ok');
    // Keep fresh for one day; otherwise use cache but refresh cache for next time
    response.header(HttpHeader.CacheControl, 'public, max-age=86400, stale-while-revalidate=604800');
    response.header(HttpHeader.ETag, cacheKey);
    response.json(sourceBounds);

    return response;
}
