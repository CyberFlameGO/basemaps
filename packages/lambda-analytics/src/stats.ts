/** Changing this number will cause all the statistics to be recomputed */
export const TileRollupVersion = 0;

export interface TileRequestStats {
    /** Time of the rollup */
    timestamp: string;
    /** Api Key used */
    api: string;
    /** Type of api key (first character generally `c` for client generated or `d` for developer) */
    apiType: string;
    /** Total number of hits */
    total: number;
    /** Cache stats as given by cloudfront */
    cache: { hit: number; miss: number };
    /** Status codes given by cloudfront */
    status: Record<number, number>;
    /** Tile exensions used */
    extension: { webp: number; jpeg: number; png: number; wmts: number; other: number };
    /** Projections used */
    projection: { 2193: number; 3857: number };
    /** Tilesets accessed */
    tileSet: { aerial: number; aerialIndividual: number; topo50: number; direct: number };
    /** How was this rollup generated */
    generated: { v: number; hash?: string; version?: string };
}

function newStat(timestamp: string, api: string): TileRequestStats {
    return {
        timestamp,
        api,
        apiType: api.charAt(0),
        total: 0,
        status: {},
        cache: { hit: 0, miss: 0 },
        extension: { webp: 0, jpeg: 0, png: 0, wmts: 0, other: 0 },
        projection: { 2193: 0, 3857: 0 },
        tileSet: { aerial: 0, aerialIndividual: 0, topo50: 0, direct: 0 },
        generated: {
            v: TileRollupVersion,
            hash: process.env.GIT_HASH,
            version: process.env.GIT_VERSION,
        },
    };
}

function track(stat: TileRequestStats, uri: string, status: number, isHit: boolean): void {
    stat.total++;

    if (isHit) stat.cache.hit++;
    else stat.cache.miss++;

    stat.status[status] = (stat.status[status] ?? 0) + 1;
    // Process only /v1/tile requests ignoring things like assests (index.html, js, css)
    if (!uri.startsWith('/v1/tiles')) return;

    // Extension
    if (uri.endsWith('.webp')) stat.extension.webp++;
    else if (uri.endsWith('.jpeg')) stat.extension.jpeg++;
    else if (uri.endsWith('.png')) stat.extension.png++;
    else if (uri.endsWith('.xml')) {
        stat.extension.wmts++;
    } else stat.extension.other++;

    const [, , , tileSet, projection] = uri.split('/');
    // no projection means this url is weirdly formatted
    if (projection == null) return;

    // Projection
    if (projection.includes('3857')) stat.projection['3857']++;
    else if (projection.includes('2193')) stat.projection['2193']++;
    else return; // Unknown projection this is likely not a tile

    // Tile set
    if (tileSet == 'aerial') stat.tileSet.aerial++;
    else if (tileSet == 'topo50') stat.tileSet.topo50++;
    // TODO do we want to get the real names for these
    else if (tileSet.startsWith('aerial:')) stat.tileSet.aerialIndividual++;
    else if (tileSet.startsWith('01')) stat.tileSet.direct++;
    else {
        // TODO do we care about these other tile sets
    }
}

export class LogStats {
    date: string;
    byApi = new Map<string, TileRequestStats>();

    constructor(date: string) {
        this.date = date;
    }

    static ByDate = new Map<string, LogStats>();
    static getDate(date: string, hours: string): LogStats {
        const logKey = date + 'T' + hours.slice(0, 2) + ':00:00.000Z';
        let existing = LogStats.ByDate.get(logKey);
        if (existing == null) {
            existing = new LogStats(logKey);
            LogStats.ByDate.set(logKey, existing);
        }
        return existing;
    }

    track(apiKey: string, uri: string, status: number, isHit: boolean): void {
        let existing = this.byApi.get(apiKey);
        if (existing == null) {
            existing = newStat(this.date, apiKey);
            this.byApi.set(apiKey, existing);
        }
        track(existing, uri, status, isHit);
    }
}
