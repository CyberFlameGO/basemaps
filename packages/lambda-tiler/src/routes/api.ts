import { LambdaHttpResponse, HttpHeader } from '@basemaps/lambda';

export const Responses = {
    Ok: new LambdaHttpResponse(200, 'ok'),
    NotModified: new LambdaHttpResponse(304, 'Not modified'),
    NotFound: new LambdaHttpResponse(404, 'Not Found'),
};

Responses.Ok.header(HttpHeader.CacheControl, 'no-store');

// export async function Health(): Promise<LambdaHttpResponse> {
//     return Responses.Ok;
// }

export async function Ping(): Promise<LambdaHttpResponse> {
    return Responses.Ok;
}

export async function Version(): Promise<LambdaHttpResponse> {
    const response = new LambdaHttpResponse(200, 'ok');
    response.header(HttpHeader.CacheControl, 'no-store');
    response.json({ version: process.env.GIT_VERSION ?? 'dev', hash: process.env.GIT_HASH });
    return response;
}
