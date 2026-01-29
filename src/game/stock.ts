import type { Company } from '@/types/game';
import { GAME, COMPANY_NAMES } from './constants';

export function createCompanies(count: number): Company[] {
  const shuffled = [...COMPANY_NAMES].sort(() => Math.random() - 0.5);
  const now = Date.now();

  return shuffled.slice(0, count).map((name, i) => ({
    id: `company${i}`,
    name,
    price: Math.round(
      GAME.STOCK_MIN_PRICE + Math.random() * (GAME.STOCK_MAX_PRICE - GAME.STOCK_MIN_PRICE)
    ),
    previousPrice: GAME.STOCK_MEAN_TARGET,
    nextUpdateTime: now + randomUpdateInterval(),
  }));
}

export function updateStockPrice(company: Company, now: number): Company {
  const previousPrice = company.price;

  // Box-Muller transform for gaussian random
  const gaussianRandom = () => {
    let u = 0,
      v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  };

  const change = Math.round(gaussianRandom() * GAME.STOCK_VOLATILITY);
  const meanReversion = (GAME.STOCK_MEAN_TARGET - company.price) * GAME.STOCK_MEAN_REVERSION;

  let newPrice = Math.round(company.price + change + meanReversion);
  newPrice = Math.max(GAME.STOCK_MIN_PRICE, Math.min(GAME.STOCK_MAX_PRICE, newPrice));

  return {
    ...company,
    price: newPrice,
    previousPrice,
    nextUpdateTime: now + randomUpdateInterval(),
  };
}

function randomUpdateInterval(): number {
  return GAME.STOCK_UPDATE_MIN + Math.random() * (GAME.STOCK_UPDATE_MAX - GAME.STOCK_UPDATE_MIN);
}

export function calculateBulkUpgradeCost(currentBulk: number): number {
  return GAME.BULK_UPGRADE_BASE_COST * Math.pow(GAME.BULK_UPGRADE_MULTIPLIER, currentBulk - 1);
}
