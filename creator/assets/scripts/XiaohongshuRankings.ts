import type { StudioRecord } from './core/Studio';
import type { RankingSnapshot, StudioRankings } from './Platform';

const boards: Record<StudioRecord, number> = { funds: 1, profit: 2, days: 3 };
const minClient = 9510;
const cacheMs = 45000;
const maxScore = 1000000;

export function rankingsUnavailable(error: any) {
  return error?.errCode === 1005 || error?.errCode === 10003;
}

function readBuild(options: any): number | null {
  const value = options?.miniToolEnv?.buildVersion;
  if ((typeof value !== 'number' && typeof value !== 'string') || !/^[1-9]\d{6,}$/.test(String(value))) return null;
  const build = Number(value);
  return Number.isSafeInteger(build) ? build : null;
}

async function readWhenReady<T>(read: () => Promise<T>): Promise<T> {
  for (const delay of [500, 1000, 2000, 4000]) {
    try { return await read(); }
    catch (error) {
      if (error?.errCode !== 2002) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return read();
}

export async function createXiaohongshuRankings(xhs: any): Promise<StudioRankings | null> {
  const sdk = xhs?.miniTool;
  if (!sdk || !['submitScore', 'getRankList', 'getMyRank'].every(method => typeof sdk[method] === 'function')) return null;
  let build = readBuild(xhs.launchOptions);
  if (build === null && typeof sdk.getLaunchOptions === 'function') {
    try { build = readBuild(await sdk.getLaunchOptions()); }
    catch { return null; }
  }
  if (build === null || Math.floor(build / 1000) < minClient) return null;

  const cache = new Map<StudioRecord, { expires: number; result: Promise<RankingSnapshot> }>();
  return {
    read(record) {
      const cached = cache.get(record);
      if (cached && Date.now() < cached.expires) return cached.result;
      const options = { board: boards[record], period: 'all' };
      const result = Promise.all([
        readWhenReady<{ data: RankingSnapshot['rows'] }>(() => sdk.getRankList(options)),
        readWhenReady<RankingSnapshot['mine']>(() => sdk.getMyRank(options))
      ]).then(([list, mine]) => ({ rows: list.data, mine })).catch(error => {
        if (cache.get(record)?.result === result) cache.delete(record);
        throw error;
      });
      cache.set(record, { expires: Date.now() + cacheMs, result });
      return result;
    },
    async submit(record, score) {
      if (!Number.isFinite(score) || Math.abs(score) > maxScore) throw new RangeError('成绩超出排行榜范围');
      await sdk.submitScore({ board: boards[record], score });
      cache.delete(record);
    }
  };
}
