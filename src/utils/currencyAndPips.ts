export interface CurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  rateToUSD: number; // How many units of this currency equal 1 USD (e.g. 1600 NGN = 1 USD)
  flag: string;
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", rateToUSD: 1600, flag: "🇳🇬" },
  { code: "USD", name: "US Dollar", symbol: "$", rateToUSD: 1, flag: "🇺🇸" },
  { code: "EUR", name: "Euro", symbol: "€", rateToUSD: 0.92, flag: "🇪🇺" },
  { code: "GBP", name: "British Pound", symbol: "£", rateToUSD: 0.78, flag: "🇬🇧" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", rateToUSD: 155, flag: "🇯🇵" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", rateToUSD: 1.36, flag: "🇨🇦" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", rateToUSD: 1.50, flag: "🇦🇺" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", rateToUSD: 0.89, flag: "🇨🇭" },
  { code: "AED", name: "UAE Dirham", symbol: "AED", rateToUSD: 3.67, flag: "🇦🇪" },
  { code: "SAR", name: "Saudi Riyal", symbol: "SAR", rateToUSD: 3.75, flag: "🇸🇦" },
  { code: "ZAR", name: "South African Rand", symbol: "R", rateToUSD: 18.2, flag: "🇿🇦" },
  { code: "INR", name: "Indian Rupee", symbol: "₹", rateToUSD: 83.5, flag: "🇮🇳" },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "GH₵", rateToUSD: 15.2, flag: "🇬🇭" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", rateToUSD: 130, flag: "🇰🇪" },
  { code: "EGP", name: "Egyptian Pound", symbol: "E£", rateToUSD: 48.3, flag: "🇪🇬" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", rateToUSD: 5.5, flag: "🇧🇷" },
];

export function getStoredCurrency(): CurrencyConfig {
  try {
    const savedCode = localStorage.getItem("user_account_currency") || "NGN";
    const found = SUPPORTED_CURRENCIES.find((c) => c.code === savedCode);
    if (found) {
      const customRate = localStorage.getItem(`currency_rate_${found.code}`);
      if (customRate) {
        return { ...found, rateToUSD: parseFloat(customRate) || found.rateToUSD };
      }
      return found;
    }
  } catch (e) {
    console.error("Failed to read stored currency", e);
  }
  return SUPPORTED_CURRENCIES[0]; // Default to NGN Naira
}

export function setStoredCurrency(code: string, customRate?: number) {
  try {
    localStorage.setItem("user_account_currency", code);
    if (customRate && customRate > 0) {
      localStorage.setItem(`currency_rate_${code}`, customRate.toString());
    }
  } catch (e) {
    console.error("Failed to save currency setting", e);
  }
}

export function formatCurrencyAmount(amount: number, currency: CurrencyConfig): string {
  const isNegative = amount < 0;
  const absVal = Math.abs(amount);
  
  // Choose decimal places based on currency size
  const decimals = currency.code === "JPY" || currency.code === "NGN" || currency.code === "KES" || currency.code === "INR" 
    ? (absVal > 1000 ? 0 : 2)
    : 2;

  const formatted = absVal.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return `${isNegative ? "-" : ""}${currency.symbol}${formatted}`;
}

/**
 * Calculates pips for a given symbol and price difference.
 */
export function calculatePips(symbol: string, entryPrice: number, targetPrice: number): number {
  const d = Math.abs(entryPrice - targetPrice);
  const s = symbol.toUpperCase();

  // Forex pairs with JPY
  if (s.includes("JPY")) {
    return Number((d * 100).toFixed(1));
  }
  // Standard Forex Pairs
  if (s.includes("/") && !s.includes("XAU") && !s.includes("XAG")) {
    return Number((d * 10000).toFixed(1));
  }
  // Gold (1 Pip = $0.10 move)
  if (s.includes("XAU") || s === "GC=F" || s.toLowerCase().includes("gold")) {
    return Number((d * 10).toFixed(1));
  }
  // Silver (1 Pip = $0.01 move)
  if (s.includes("XAG") || s === "SI=F" || s.toLowerCase().includes("silver")) {
    return Number((d * 100).toFixed(1));
  }
  // Crude Oil / Natural Gas
  if (s.includes("CL") || s.includes("NG") || s.includes("CRUDE")) {
    return Number((d * 100).toFixed(1));
  }
  // Crypto, Stocks, Indices, Bonds (1 point = 1 pip)
  return Number(d.toFixed(2));
}

/**
 * Calculates monetary profit or loss for a trade given entry, target, lot size, and account currency.
 */
export function calculateTradePnL(params: {
  symbol: string;
  category: string;
  direction: "BUY" | "SELL" | "WAIT" | "NO TRADE" | string;
  entryPrice: number;
  targetPrice: number;
  lotSize: number;
  currency: CurrencyConfig;
  accountBalanceUSD?: number;
}): { pips: number; priceDiff: number; pnlUSD: number; pnlCurrency: number; pnlPercentOfBalance: number } {
  const { symbol, category, direction, entryPrice, targetPrice, lotSize, currency, accountBalanceUSD = 10000 } = params;

  const isBuy = direction === "BUY";
  const priceDiff = isBuy ? targetPrice - entryPrice : entryPrice - targetPrice;
  const pips = calculatePips(symbol, entryPrice, targetPrice);

  let pnlUSD = 0;

  // Position units logic
  let units = lotSize;
  const catUpper = category.toUpperCase();
  const symUpper = symbol.toUpperCase();

  if (catUpper === "FOREX" || (symUpper.includes("/") && !symUpper.includes("XAU") && !symUpper.includes("XAG"))) {
    units = lotSize * 100000; // 1 Lot = 100,000 units
    if (symUpper.includes("JPY")) {
      // 100,000 JPY / entry price ~ USD value
      pnlUSD = (priceDiff / entryPrice) * units;
    } else {
      pnlUSD = priceDiff * units;
    }
  } else if (symUpper.includes("XAU") || symUpper.includes("GOLD")) {
    units = lotSize * 100; // 1 Lot of Gold = 100 oz
    pnlUSD = priceDiff * units;
  } else if (symUpper.includes("XAG") || symUpper.includes("SILVER")) {
    units = lotSize * 5000; // 1 Lot of Silver = 5000 oz
    pnlUSD = priceDiff * units;
  } else if (catUpper === "CRYPTO") {
    units = lotSize; // 1 unit = 1 coin
    pnlUSD = priceDiff * units;
  } else if (catUpper === "STOCKS" || catUpper === "ETFS") {
    units = lotSize; // 1 unit = 1 share
    pnlUSD = priceDiff * units;
  } else {
    // Indices / Futures / Bonds
    units = lotSize * 10; // Standard multiplier
    pnlUSD = priceDiff * units;
  }

  const pnlCurrency = pnlUSD * currency.rateToUSD;
  const accountBalanceCurrency = accountBalanceUSD * currency.rateToUSD;
  const pnlPercentOfBalance = accountBalanceCurrency > 0 ? (pnlCurrency / accountBalanceCurrency) * 100 : 0;

  return {
    pips,
    priceDiff,
    pnlUSD,
    pnlCurrency,
    pnlPercentOfBalance,
  };
}
