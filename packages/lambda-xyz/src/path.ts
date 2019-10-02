import * as Path from 'path-to-regexp';
import { LambdaHttpResponseAlb } from '@basemaps/shared';

const XyzPath = Path('/:group/:z/:x/:y\\.:ext');

export interface PathData {
    group: string;
    x: number;
    y: number;
    z: number;
    ext: string;
}
export function getXyzFromPath(path: string): null | PathData {
    const output = XyzPath.exec(path);
    if (output == null) {
        return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, group, z, x, y, ext] = output;
    return { group, x: parseInt(x, 10), y: parseInt(y, 10), z: parseInt(z, 10), ext };
}

export function route(httpMethod: string, path: string): PathData | LambdaHttpResponseAlb {
    // Allow cross origin requests
    if (httpMethod === 'options') {
        return new LambdaHttpResponseAlb(200, 'Options', {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': 'false',
            'Access-Control-Allow-Methods': 'OPTIONS,GET,PUT,POST,DELETE',
        });
    }

    if (httpMethod !== 'get') {
        return new LambdaHttpResponseAlb(405, 'Method not allowed');
    }

    // TODO this is getting slightly messy, maybe we should move it into a
    // full express application so we can `app.get('/ping', () => ok);`
    if (path === '/ping') {
        return new LambdaHttpResponseAlb(200, 'ok');
    }

    if (path === '/health') {
        return new LambdaHttpResponseAlb(200, 'ok');
    }

    if (path === '/version') {
        const response = new LambdaHttpResponseAlb(200, 'ok');
        response.json({ version: 1, hash: 'hash' });
        return response;
    }

    const pathMatch = getXyzFromPath(path);
    if (pathMatch == null) {
        return new LambdaHttpResponseAlb(404, 'Path not found');
    }

    return pathMatch;
}
