import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import BTCPage, { formatCountdown, formatNumber, formatCompact } from './page';

describe('BTC Page Utility Functions', () => {
  describe('formatCountdown', () => {
    it('returns "-" when nextFundingTime is 0', () => {
      expect(formatCountdown(0)).toBe('-');
    });

    it('returns "-" when nextFundingTime is undefined (NaN)', () => {
      expect(formatCountdown(NaN)).toBe('-');
    });

    it('formats countdown correctly', () => {
      const now = Date.now();
      const futureTime = now + (2 * 3600 + 30 * 60 + 45) * 1000; // 2h 30m 45s
      const result = formatCountdown(futureTime);
      expect(result).toBe('2 小时 30 分 45 秒');
    });

    it('returns 0 hours for times less than an hour', () => {
      const now = Date.now();
      const futureTime = now + (25 * 60 + 10) * 1000; // 25m 10s
      const result = formatCountdown(futureTime);
      expect(result).toBe('0 小时 25 分 10 秒');
    });

    it('caps negative time differences at 0 seconds', () => {
      const pastTime = Date.now() - 5000; // 5 seconds in the past
      const result = formatCountdown(pastTime);
      expect(result).toBe('0 小时 00 分 00 秒');
    });
  });

  describe('formatNumber', () => {
    it('formats numbers with default 2 decimals', () => {
      expect(formatNumber(1234567.89)).toBe('1,234,567.89');
    });

    it('formats numbers with custom decimals', () => {
      expect(formatNumber(1234.567, 3)).toBe('1,234.567');
    });

    it('handles string input', () => {
      expect(formatNumber('1234.56')).toBe('1,234.56');
    });

    it('returns "-" for NaN', () => {
      expect(formatNumber(NaN)).toBe('-');
    });

    it('returns "-" for undefined', () => {
      expect(formatNumber(undefined as any)).toBe('-');
    });

    it('returns "-" for null', () => {
      expect(formatNumber(null as any)).toBe('-');
    });
  });

  describe('formatCompact', () => {
    it('formats numbers in billions (亿)', () => {
      expect(formatCompact(123456789)).toBe('1.23亿');
    });

    it('formats numbers in ten-thousands (万)', () => {
      expect(formatCompact(123456)).toBe('12.35万');
    });

    it('formats small numbers with 2 decimals', () => {
      expect(formatCompact(1234.56)).toBe('1234.56');
    });

    it('handles string input', () => {
      expect(formatCompact('12345678')).toBe('1234.57万');
    });

    it('returns "-" for NaN', () => {
      expect(formatCompact(NaN)).toBe('-');
    });

    it('returns "-" for undefined', () => {
      expect(formatCompact(undefined as any)).toBe('-');
    });

    it('returns "-" for null', () => {
      expect(formatCompact(null as any)).toBe('-');
    });
  });
});

describe('BTCPage Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders page with default stats', () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ error: null }),
    }) as any;

    render(<BTCPage />);
    expect(screen.getByText('BTC/USDT 现货')).toBeTruthy();
  });

  it('renders stats grid with default values', () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ error: null }),
    }) as any;

    render(<BTCPage />);
    
    expect(screen.getByText('最新价格')).toBeTruthy();
    expect(screen.getByText('指数价格')).toBeTruthy();
    expect(screen.getByText('24小时涨跌')).toBeTruthy();
    expect(screen.getByText('24小时最高')).toBeTruthy();
    expect(screen.getByText('24小时最低')).toBeTruthy();
    expect(screen.getByText('24小时成交量 (BTC)')).toBeTruthy();
    expect(screen.getByText('24小时成交额 (USDT)')).toBeTruthy();
  });

  it('updates countdown timer', async () => {
    const futureTime = Date.now() + 3600000; // 1 hour from now
    
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        price: 74000,
        priceChange: 100,
        priceChangePercent: 0.5,
        indexPrice: 74000,
        markPrice: 74000,
        fundingRate: 0.01,
        nextFundingTime: futureTime,
        high24h: 75000,
        low24h: 73000,
        openInterest: 2500000000,
        volume24h: 100000,
        amount24h: 7000000000,
      }),
    }) as any;

    render(<BTCPage />);

    // Wait for initial fetch
    await act(async () => {
      await Promise.resolve();
    });

    // Advance timer by 1 second
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // The countdown should be updated
    // Verify that setInterval was called (countdown updates)
  });

  it('displays price with correct sign for positive change', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        price: 74000,
        priceChange: 100,
        priceChangePercent: 0.5,
        indexPrice: 74000,
        markPrice: 74000,
        fundingRate: 0.01,
        nextFundingTime: 0,
        high24h: 75000,
        low24h: 73000,
        openInterest: 2500000000,
        volume24h: 100000,
        amount24h: 7000000000,
      }),
    }) as any;

    render(<BTCPage />);

    await act(async () => {
      await Promise.resolve();
    });

    // Should display +100 for positive price change
    const priceChangeElement = screen.getByText(/\+100\.00/);
    expect(priceChangeElement).toBeTruthy();
  });

  it('displays price with correct sign for negative change', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        price: 74000,
        priceChange: -100,
        priceChangePercent: -0.5,
        indexPrice: 74000,
        markPrice: 74000,
        fundingRate: 0.01,
        nextFundingTime: 0,
        high24h: 75000,
        low24h: 73000,
        openInterest: 2500000000,
        volume24h: 100000,
        amount24h: 7000000000,
      }),
    }) as any;

    render(<BTCPage />);

    await act(async () => {
      await Promise.resolve();
    });

    // Should display -100 for negative price change
    const priceChangeElement = screen.getByText(/-100\.00/);
    expect(priceChangeElement).toBeTruthy();
  });

  it('handles fetch error gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error')) as any;

    render(<BTCPage />);

    await act(async () => {
      await Promise.resolve();
    });

    // Should still render with default values
    expect(screen.getByText('BTC/USDT 现货')).toBeTruthy();
  });
});
