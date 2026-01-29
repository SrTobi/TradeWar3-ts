import { create } from 'zustand';
import type { GameState, LocalPlayerState, Company } from '@/types/game';
import { GAME } from '@/game/constants';
import { calculateBulkUpgradeCost } from '@/game/stock';

interface GameStore {
  gameState: GameState | null;
  local: LocalPlayerState;
  setGameState: (state: GameState) => void;
  setLocalPlayer: (playerId: string, factionId: string) => void;
  buyStock: (company: Company) => void;
  sellStock: (company: Company) => void;
  upgradeBulk: () => void;
  spendMoney: (amount: number) => boolean;
  reset: () => void;
}

const initialLocal: LocalPlayerState = {
  playerId: null,
  factionId: null,
  money: GAME.INITIAL_MONEY,
  holdings: {},
  bulkAmount: GAME.INITIAL_BULK,
};

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  local: { ...initialLocal },

  setGameState: (state) => set({ gameState: state }),

  setLocalPlayer: (playerId, factionId) =>
    set((s) => ({
      local: { ...s.local, playerId, factionId },
    })),

  buyStock: (company) => {
    const { local } = get();
    const cost = company.price * local.bulkAmount;
    if (local.money < cost) return;

    set((s) => ({
      local: {
        ...s.local,
        money: s.local.money - cost,
        holdings: {
          ...s.local.holdings,
          [company.id]: (s.local.holdings[company.id] || 0) + s.local.bulkAmount,
        },
      },
    }));
  },

  sellStock: (company) => {
    const { local } = get();
    const held = local.holdings[company.id] || 0;
    const toSell = Math.min(held, local.bulkAmount);
    if (toSell <= 0) return;

    const revenue = company.price * toSell;
    set((s) => ({
      local: {
        ...s.local,
        money: s.local.money + revenue,
        holdings: {
          ...s.local.holdings,
          [company.id]: held - toSell,
        },
      },
    }));
  },

  upgradeBulk: () => {
    const { local } = get();
    const cost = calculateBulkUpgradeCost(local.bulkAmount);
    if (local.money < cost) return;

    set((s) => ({
      local: {
        ...s.local,
        money: s.local.money - cost,
        bulkAmount: s.local.bulkAmount + 1,
      },
    }));
  },

  spendMoney: (amount) => {
    const { local } = get();
    if (local.money < amount) return false;

    set((s) => ({
      local: { ...s.local, money: s.local.money - amount },
    }));
    return true;
  },

  reset: () =>
    set({
      gameState: null,
      local: { ...initialLocal },
    }),
}));
