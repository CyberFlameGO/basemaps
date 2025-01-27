import { LogType, getUrlHost, fsa } from '@basemaps/shared';
import { createInterface, Interface } from 'readline';
import { createGunzip } from 'zlib';
import { LogStats } from './stats.js';

export const FileProcess = {
  reader(fileName: string): AsyncGenerator<string> | Interface {
    return createInterface({ input: fsa.stream(fileName).pipe(createGunzip()) });
  },
  async process(fileName: string, stats: LogStats, logger: LogType): Promise<void> {
    const lineReader = FileProcess.reader(fileName);
    for await (const line of lineReader) {
      if (line.startsWith('#')) continue;
      const lineData = line.split('\t');

      const date = lineData[0];
      const time = lineData[1];

      const dateStr = `${date}T${time.slice(0, 2)}:00:00.000Z`;
      if (dateStr !== stats.date) {
        logger.error({ got: dateStr, expected: stats.date, line }, 'Invalid date record');
        continue;
      }

      const uri = lineData[7];
      const status = lineData[8];
      const referer = lineData[9] === '-' ? undefined : getUrlHost(lineData[9]);
      const query = lineData[11];
      const hit = lineData[13] === 'Hit' || lineData[13] === 'RefreshHit';

      // Ignore requests which are not tile requests
      if (!uri.startsWith('/v1')) continue;
      if (!query.startsWith('api=')) {
        logger.debug({ uri, query }, 'NoApiKey');
        continue;
      }
      // TODO This could be switched to a QueryString parser
      const endIndex = query.indexOf('&');
      const apiKey = query.slice('api='.length, endIndex === -1 ? query.length : endIndex);
      stats.track(apiKey, referer, uri.toLowerCase(), parseInt(status), hit);
    }
  },
};
