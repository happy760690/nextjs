import { NextRequest } from 'next/server';
import { ProxyAgent, request as undiciRequest } from 'undici';

const PROXY_URL = 'http://127.0.0.1:8118';

const BAR_MAP: Record<string, string> = {
  '1s': '1s', '1m': '1m', '5m': '5m', '15m': '15m',
  '1H': '1H', '4H': '4H', '1D': '1D',
};

export async function GET(req: NextRequest) {
  const bar = req.nextUrl.searchParams.get('bar') ?? '1m';
  const okxBar = BAR_MAP[bar] ?? '1m';
  const url = `https://www.okx.com/api/v5/market/candles?instId=BTC-USDT&bar=${okxBar}&limit=300`;

  try {
    const dispatcher = new ProxyAgent({ uri: PROXY_URL });
    const { statusCode, body } = await undiciRequest(url, {
      dispatcher,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const json: any = await body.json();
    if (json.code !== '0') {
      return Response.json({ error: json.msg }, { status: 500 });
    }

    const data = (json.data as string[][])
      .map(([ts, o, h, l, c]) => ({
        time:  Math.floor(Number(ts) / 1000),
        open:  Number(o), high: Number(h), low: Number(l), close: Number(c),
      }))
      .sort((a, b) => a.time - b.time);

    return Response.json(data);
  } catch (e: any) {
    console.error('[okx] fetch error:', e?.message ?? e);
    return Response.json({ error: e?.message ?? 'fetch failed' }, { status: 502 });
  }
}