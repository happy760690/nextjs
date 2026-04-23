'use client';

import { useState, useEffect } from 'react';
import KlineChart from './KlineChart';

interface MarketStats {
  price: number;
  priceChange: number;
  priceChangePercent: number;
  indexPrice: number;
  markPrice: number;
  fundingRate: number;
  nextFundingTime: number;
  high24h: number;
  low24h: number;
  openInterest: number;
  volume24h: number;
  amount24h: number;
}

function formatNumber(num: number | string, decimals: number = 2): string {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (n === undefined || n === null || isNaN(n)) return '-';
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatCompact(num: number | string): string {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (n === undefined || n === null || isNaN(n)) return '-';
  if (n >= 100000000) {
    return (n / 100000000).toFixed(2) + '亿';
  }
  if (n >= 10000) {
    return (n / 10000).toFixed(2) + '万';
  }
  return n.toFixed(2);
}

export default function BTCPage() {
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState<MarketStats>();

  // Fetch ticker data with polling
  useEffect(() => {
    const fetchStats = () => {
      fetch('/api/btc-stats')
        .then(res => res.json())
        .then(data => {
          if (data.error || data.price === undefined) return;
          setStats({
            price: data.price ?? 0,
            priceChange: data.priceChange ?? 0,
            priceChangePercent: data.priceChangePercent ?? 0,
            indexPrice: data.indexPrice ?? 0,
            markPrice: data.markPrice ?? 0,
            fundingRate: data.fundingRate ?? 0,
            nextFundingTime: data.nextFundingTime ?? 0,
            high24h: data.high24h ?? 0,
            low24h: data.low24h ?? 0,
            openInterest: data.openInterest ?? 0,
            volume24h: data.volume24h ?? 0,
            amount24h: data.amount24h ?? 0,
          });
          setLoading(false);
        })
        .catch(console.error);
    };

    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) {
    return (
      <div className="p-6">
        <div className="text-center py-10">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">BTC/USDT 现货</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-4">
        {/* Price */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">最新价格</div>
          <div className="text-2xl font-bold text-gray-900">${formatNumber(stats.price)}</div>
        </div>

        {/* Index Price */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">指数价格</div>
          <div className="text-xl font-bold text-blue-600">${formatNumber(stats.indexPrice)}</div>
        </div>

        {/* 24h Change */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">24小时涨跌</div>
          <div className="flex flex-col gap-1">
            <span className={`text-xl font-bold ${stats.priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {stats.priceChange >= 0 ? '+' : ''}{formatNumber(stats.priceChange)}
            </span>
            <span className={`text-sm ${stats.priceChangePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {stats.priceChangePercent >= 0 ? '+' : ''}{(stats.priceChangePercent ?? 0).toFixed(2)}%
            </span>
          </div>
        </div>

        {/* 24h High */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">24小时最高</div>
          <div className="text-xl font-bold text-gray-900">${formatNumber(stats.high24h)}</div>
        </div>

        {/* 24h Low */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">24小时最低</div>
          <div className="text-xl font-bold text-gray-900">${formatNumber(stats.low24h)}</div>
        </div>

        {/* 24h Volume */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">24小时成交量 (BTC)</div>
          <div className="text-xl font-bold text-gray-900">{formatCompact(stats.volume24h)}</div>
        </div>

        {/* 24h Amount */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-500 mb-1">24小时成交额 (USDT)</div>
          <div className="text-xl font-bold text-gray-900">{formatCompact(stats.amount24h)}</div>
        </div>
      </div>

      {/* Chart */}
      <KlineChart />
    </div>
  );
}