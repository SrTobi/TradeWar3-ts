import { observableValue, transaction } from '@vscode/observables';
import type { GameState, LocalPlayerState, Company } from '@/types/game';
import { GAME } from '@/game/constants';
import { calculateBulkUpgradeCost } from '@/game/stock';

const initialLocal: LocalPlayerState = {
  playerId: null,
  factionId: null,
  money: GAME.INITIAL_MONEY,
  holdings: {},
  bulkAmount: GAME.INITIAL_BULK,
};

// Game Store using observables
class GameStoreClass {
  readonly gameState = observableValue<GameState | null>('gameStore.gameState', null);
  readonly local = observableValue<LocalPlayerState>('gameStore.local', { ...initialLocal });

  setGameState = (state: GameState) => {
    this.gameState.set(state, undefined);
  };

  setLocalPlayer = (playerId: string, factionId: string) => {
    const current = this.local.get();
    this.local.set({ ...current, playerId, factionId }, undefined);
  };

  buyStock = (company: Company) => {
    const local = this.local.get();
    const cost = company.price * local.bulkAmount;
    if (local.money < cost) return;

    this.local.set({
      ...local,
      money: local.money - cost,
      holdings: {
        ...local.holdings,
        [company.id]: (local.holdings[company.id] || 0) + local.bulkAmount,
      },
    }, undefined);
  };

  sellStock = (company: Company) => {
    const local = this.local.get();
    const held = local.holdings[company.id] || 0;
    const toSell = Math.min(held, local.bulkAmount);
    if (toSell <= 0) return;

    const revenue = company.price * toSell;
    this.local.set({
      ...local,
      money: local.money + revenue,
      holdings: {
        ...local.holdings,
        [company.id]: held - toSell,
      },
    }, undefined);
  };

  upgradeBulk = () => {
    const local = this.local.get();
    const cost = calculateBulkUpgradeCost(local.bulkAmount);
    if (local.money < cost) return;

    this.local.set({
      ...local,
      money: local.money - cost,
      bulkAmount: local.bulkAmount + 1,
    }, undefined);
  };

  spendMoney = (amount: number): boolean => {
    const local = this.local.get();
    if (local.money < amount) return false;

    this.local.set({ ...local, money: local.money - amount }, undefined);
    return true;
  };

  addMoney = (amount: number): void => {
    const local = this.local.get();
    this.local.set({ ...local, money: local.money + amount }, undefined);
  };

  reset = () => {
    transaction((tx) => {
      this.gameState.set(null, tx);
      this.local.set({ ...initialLocal }, tx);
    });
  };
}

// Singleton instance
export const gameStore = new GameStoreClass();
