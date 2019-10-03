process.env['COG_BUCKET'] = 'fake-bucket';

jest.mock('@cogeotiff/source-aws');

import { Logger, Env, LambdaSession } from '@basemaps/shared';
import { ALBEvent } from 'aws-lambda';
import { handleRequest } from '../index';
import { CogSourceAwsS3 } from '@cogeotiff/source-aws';
import { Tilers } from '../tiler';
import { Tiler } from '@basemaps/tiler';

/* eslint-disable @typescript-eslint/explicit-function-return-type */
describe('LambdaXyz', () => {
    /** Generate mock ALBEvent */
    function req(path: string, method = 'get'): ALBEvent {
        return {
            requestContext: null as any,
            httpMethod: method.toUpperCase(),
            path,
            body: null,
            isBase64Encoded: false,
        };
    }

    let counter = 0;
    const tileMock = jest.fn();
    const rasterMock = jest.fn();
    const rasterMockBuffer = Buffer.from([1]);

    beforeEach(() => {
        LambdaSession.reset();

        // Mock the tile generation
        Tilers.tile256 = new Tiler(256);
        Tilers.tile256.tile = tileMock;
        Tilers.tile256.raster.compose = rasterMock;
        tileMock.mockReset();
        rasterMock.mockReset();
        tileMock.mockReturnValue(['TileMock']);
        rasterMock.mockReturnValue(rasterMockBuffer);

        const createMock = CogSourceAwsS3.create;
        if (!jest.isMockFunction(createMock)) {
            throw new Error('Mock did not work');
        }
        // For each tiff created generate a unique number
        createMock.mockImplementation(() => counter++);
    });

    it('should generate a tile 0,0,0', async () => {
        const res = await handleRequest(req('/0/0/0/0.png'), null as any, Logger);
        expect(res.status).toEqual(200);
        expect(res.headers).toEqual({
            'content-type': 'image/png',
            // TODO Should we hardcode a base64'd hash here?
            etag: 'IIasQDnNSdw55Q4npcCyYmLmkWB8vBbemMiDIdAgqC4=',
        });
        expect(res.toResponse().body).toEqual(rasterMockBuffer.toString('base64'));

        expect(tileMock.mock.calls.length).toEqual(1);
        const [firstCall] = tileMock.mock.calls;

        const [tifs, x, y, z] = firstCall;
        expect(tifs).toEqual([0, 1]);
        expect(x).toEqual(0);
        expect(y).toEqual(0);
        expect(z).toEqual(0);

        // Validate the session information has been set correctly
        const session = LambdaSession.get();
        expect(session.logContext['path']).toEqual('/0/0/0/0.png');
        expect(session.logContext['method']).toEqual('get');
        expect(session.logContext['xyz']).toEqual({ x: 0, y: 0, z: 0 });
        expect(session.logContext['location']).toEqual({ lat: 0, lon: 0 });
    });

    it('should 404 if a tile is in bounds', async () => {
        tileMock.mockReset();
        const res = await handleRequest(req('/0/0/0/0.png'), null as any, Logger);
        expect(res.status).toEqual(404);
        expect(tileMock.mock.calls.length).toEqual(1);
        expect(rasterMock.mock.calls.length).toEqual(0);
    });

    it('should 304 if a tile is not modified', async () => {
        const request = req('/0/0/0/0.png');
        request.headers = { 'if-none-match': '"IIasQDnNSdw55Q4npcCyYmLmkWB8vBbemMiDIdAgqC4="' };
        const res = await handleRequest(request, null as any, Logger);
        expect(res.status).toEqual(304);
        expect(tileMock.mock.calls.length).toEqual(1);
        expect(rasterMock.mock.calls.length).toEqual(0);

        const session = LambdaSession.get();
        expect(session.logContext['cache'].hit).toEqual(true);
    });

    ['/favicon.ico', '/index.html', '/foo/bar'].forEach(path => {
        it('should error on invalid paths: ' + path, async () => {
            const res = await handleRequest(req(path), null as any, Logger);
            expect(res.status).toEqual(404);
        });
    });

    it('should respond to /version', async () => {
        process.env[Env.Version] = 'version';
        process.env[Env.Hash] = 'hash';
        const res = await handleRequest(req('/version'), null as any, Logger);
        expect(res.statusDescription).toEqual('ok');
        expect(res.status).toEqual(200);
        expect(res.toResponse().body).toEqual(JSON.stringify({ version: 'version', hash: 'hash' }));
        expect(res.toResponse().headers).toEqual({ 'content-type': 'application/json' });
    });

    it('should respond to /health', async () => {
        const res = await handleRequest(req('/health'), null as any, Logger);
        expect(res.statusDescription).toEqual('ok');
        expect(res.status).toEqual(200);
        expect(res.toResponse().body).toEqual(JSON.stringify({ status: 200, message: 'ok' }));
        expect(res.toResponse().headers).toEqual({ 'content-type': 'application/json' });
    });

    it('should respond to /ping', async () => {
        const res = await handleRequest(req('/ping'), null as any, Logger);
        expect(res.statusDescription).toEqual('ok');
        expect(res.status).toEqual(200);
        expect(res.toResponse().body).toEqual(JSON.stringify({ status: 200, message: 'ok' }));
        expect(res.toResponse().headers).toEqual({ 'content-type': 'application/json' });
    });
});