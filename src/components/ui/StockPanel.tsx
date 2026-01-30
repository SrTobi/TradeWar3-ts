import { useRef, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useUIStore } from '@/store/uiStore';
import { calculateBulkUpgradeCost } from '@/game/stock';
import { getEffectiveUnitCost } from '@/game/constants';
import { playBuy, playSell, playUpgrade } from '@/audio/sounds';

const HISTORY_LENGTH = 20;

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: 'min(100vw, 520px)',
  height: '100%',
  background: 'rgba(20, 26, 38, 0.92)',
  borderRight: '2px solid rgba(77, 102, 128, 0.5)',
  padding: 'clamp(8px, 2vw, 16px)',
  display: 'flex',
  flexDirection: 'column',
  fontFamily: "'Segoe UI', system-ui, sans-serif",
  overflowX: 'hidden',
};

const titleStyle: React.CSSProperties = {
  fontSize: 'clamp(14px, 4vw, 22px)',
  fontWeight: 'bold',
  color: '#b3cce6',
  textAlign: 'center',
  marginBottom: 'clamp(6px, 2vw, 12px)',
  textShadow: '0 2px 4px rgba(0,0,0,0.5)',
  letterSpacing: 'clamp(1px, 0.5vw, 2px)',
};

const topRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 0',
};

const balanceStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: '4px',
};

const balanceValueStyle: React.CSSProperties = {
  fontSize: 'clamp(14px, 4vw, 20px)',
  fontWeight: 'bold',
  color: '#66ff99',
};

const balanceLabelStyle: React.CSSProperties = {
  fontSize: 'clamp(10px, 3vw, 14px)',
  color: '#99ccb3',
};

const unitCostStyle: React.CSSProperties = {
  fontSize: 'clamp(11px, 3vw, 15px)',
  fontWeight: 'bold',
  color: '#ffcc80',
};

const separatorStyle: React.CSSProperties = {
  height: '2px',
  background: 'rgba(77, 102, 128, 0.5)',
  margin: '8px 0 12px 0',
};

const headerRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(60px, 1fr) minmax(40px, 60px) minmax(50px, 80px) 20px minmax(30px, 50px) minmax(40px, 60px) minmax(40px, 60px)',
  gap: 'clamp(2px, 1vw, 6px)',
  padding: '0 4px 8px 4px',
  fontSize: 'clamp(8px, 2vw, 11px)',
  color: '#99aabb',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const companyListStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  overflowY: 'auto',
};

const companyRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(60px, 1fr) minmax(40px, 60px) minmax(50px, 80px) 20px minmax(30px, 50px) minmax(40px, 60px) minmax(40px, 60px)',
  gap: 'clamp(2px, 1vw, 6px)',
  alignItems: 'center',
  padding: 'clamp(4px, 1vw, 6px) clamp(4px, 1.5vw, 10px)',
  background: 'rgba(0, 0, 0, 0.25)',
  borderRadius: '4px',
  border: '1px solid rgba(77, 102, 128, 0.2)',
};

const companyNameStyle: React.CSSProperties = {
  fontWeight: 'bold',
  color: '#e6eeff',
  fontSize: 'clamp(10px, 2.5vw, 13px)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const priceStyle: React.CSSProperties = {
  textAlign: 'right',
  fontWeight: 'bold',
  fontSize: 'clamp(10px, 2.5vw, 13px)',
};

const changeStyle: React.CSSProperties = {
  textAlign: 'center',
  fontWeight: 'bold',
  fontSize: 'clamp(10px, 2.5vw, 14px)',
};

const holdingsStyle: React.CSSProperties = {
  textAlign: 'center',
  fontWeight: 'bold',
  fontSize: 'clamp(10px, 2.5vw, 13px)',
};

const buttonStyle: React.CSSProperties = {
  padding: 'clamp(3px, 1vw, 5px) clamp(2px, 0.5vw, 4px)',
  background: 'rgba(51, 64, 89, 1)',
  border: '1px solid rgba(85, 119, 153, 0.5)',
  color: '#fff',
  cursor: 'pointer',
  borderRadius: '3px',
  fontSize: 'clamp(8px, 2vw, 10px)',
  fontWeight: 'bold',
  transition: 'all 0.15s',
};

const buttonDisabledStyle: React.CSSProperties = {
  ...buttonStyle,
  background: 'rgba(30, 30, 46, 0.7)',
  color: '#556',
  cursor: 'not-allowed',
};

const bottomRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 0 0 0',
  marginTop: '8px',
  borderTop: '2px solid rgba(77, 102, 128, 0.5)',
};

const bulkLabelStyle: React.CSSProperties = {
  fontSize: 'clamp(10px, 2.5vw, 14px)',
  color: '#ccd8ff',
};

const bulkValueStyle: React.CSSProperties = {
  fontWeight: 'bold',
  color: '#aabbff',
};

const upgradeButtonStyle: React.CSSProperties = {
  padding: 'clamp(6px, 1.5vw, 10px) clamp(8px, 2vw, 16px)',
  background: 'rgba(51, 85, 51, 1)',
  border: '1px solid rgba(85, 153, 85, 0.5)',
  color: '#fff',
  cursor: 'pointer',
  borderRadius: '4px',
  fontSize: 'clamp(9px, 2vw, 12px)',
  fontWeight: 'bold',
  transition: 'all 0.15s',
};

const upgradeDisabledStyle: React.CSSProperties = {
  ...upgradeButtonStyle,
  background: 'rgba(30, 30, 46, 0.7)',
  color: '#556',
  cursor: 'not-allowed',
};

// Mini sparkline chart component
function Sparkline({ history }: { history: number[] }) {
  if (history.length < 2) return null;

  const width = 80;
  const height = 20;
  const padding = 2;

  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;

  const points = history
    .map((price, i) => {
      const x = padding + (i / (history.length - 1)) * (width - padding * 2);
      const y = height - padding - ((price - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  // Color based on trend (first vs last)
  const trend = history[history.length - 1] - history[0];
  const color = trend >= 0 ? '#4f8' : '#f66';

  return (
    <svg 
      viewBox={`0 0 ${width} ${height}`} 
      style={{ display: 'block', width: '100%', height: 'auto', minWidth: '40px', maxWidth: '80px' }}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Current price dot */}
      <circle
        cx={width - padding}
        cy={
          height - padding - ((history[history.length - 1] - min) / range) * (height - padding * 2)
        }
        r="2"
        fill={color}
      />
    </svg>
  );
}

export function StockPanel() {
  const gameState = useGameStore((s) => s.gameState);
  const local = useGameStore((s) => s.local);
  const buyStock = useGameStore((s) => s.buyStock);
  const sellStock = useGameStore((s) => s.sellStock);
  const upgradeBulk = useGameStore((s) => s.upgradeBulk);
  const playerName = useUIStore((s) => s.playerName);

  // Track price history for each company
  const priceHistoryRef = useRef<Map<string, number[]>>(new Map());

  // Update price history when prices change
  useEffect(() => {
    if (!gameState) return;

    for (const company of gameState.companies) {
      const history = priceHistoryRef.current.get(company.id) || [];

      // Only add if price changed or history is empty
      if (history.length === 0 || history[history.length - 1] !== company.price) {
        history.push(company.price);
        if (history.length > HISTORY_LENGTH) {
          history.shift();
        }
        priceHistoryRef.current.set(company.id, history);
      }
    }
  }, [gameState?.companies]);

  if (!gameState) return null;

  const upgradeCost = calculateBulkUpgradeCost(local.bulkAmount);
  const effectiveUnitCost = getEffectiveUnitCost(gameState.unitCost, playerName);

  const devMode = window.location.hostname === 'localhost';

  return (
    <div style={panelStyle}>
      <div style={titleStyle}>GALACTIC EXCHANGE</div>

      {/* Balance and Unit Cost on same row */}
      <div style={topRowStyle}>
        <div style={balanceStyle}>
          <span style={balanceValueStyle}>{local.money.toLocaleString()}</span>
          <span style={balanceLabelStyle}>Credits</span>
          {devMode && (
            <button
              style={{
                marginLeft: 12,
                padding: '2px 10px',
                fontSize: 13,
                background: '#222',
                color: '#6f6',
                border: '1px solid #393',
                borderRadius: 4,
                cursor: 'pointer',
              }}
              onClick={() =>
                useGameStore.setState((s) => ({
                  local: { ...s.local, money: s.local.money + 1_000_000 },
                }))
              }
              title="Add 1,000,000 credits (devmode)"
            >
              +1M €
            </button>
          )}
        </div>
        <span style={unitCostStyle}>Unit: {effectiveUnitCost.toLocaleString()}</span>
      </div>

      <div style={separatorStyle} />

      {/* Column headers */}
      <div style={headerRowStyle}>
        <span>Company</span>
        <span style={{ textAlign: 'right' }}>Price</span>
        <span style={{ textAlign: 'center' }}>Trend</span>
        <span></span>
        <span style={{ textAlign: 'center' }}>Own</span>
        <span></span>
        <span></span>
      </div>

      {/* Company list */}
      <div style={companyListStyle}>
        {gameState.companies.map((company) => {
          const held = local.holdings[company.id] || 0;
          const priceChange = company.price - company.previousPrice;
          const canBuy = local.money >= company.price * local.bulkAmount;
          const canSell = held >= 1;
          const history = priceHistoryRef.current.get(company.id) || [company.price];

          // Price color based on relative value
          const priceRatio = company.price / 2000;
          let priceColor = '#ffffaa'; // Yellow (normal)
          if (priceRatio > 1.2)
            priceColor = '#ff8888'; // Red (expensive)
          else if (priceRatio < 0.8) priceColor = '#88ffaa'; // Green (cheap)

          return (
            <div key={company.id} style={companyRowStyle}>
              <span style={companyNameStyle}>{company.name}</span>
              <span style={{ ...priceStyle, color: priceColor }}>
                {company.price.toLocaleString()}
              </span>
              <Sparkline history={history} />
              <span
                style={{
                  ...changeStyle,
                  color: priceChange >= 0 ? '#4f8' : '#f44',
                }}
              >
                {priceChange > 0 ? '+' : priceChange < 0 ? '-' : ''}
              </span>
              <span
                style={{
                  ...holdingsStyle,
                  color: held > 0 ? '#88ffaa' : '#556677',
                }}
              >
                {held}
              </span>
              <button
                style={canBuy ? buttonStyle : buttonDisabledStyle}
                onClick={() => {
                  buyStock(company);
                  playBuy();
                }}
                disabled={!canBuy}
              >
                BUY
              </button>
              <button
                style={canSell ? buttonStyle : buttonDisabledStyle}
                onClick={() => {
                  sellStock(company);
                  playSell();
                }}
                disabled={!canSell}
              >
                SELL
              </button>
            </div>
          );
        })}
      </div>

      {/* Trade Amount and Upgrade at bottom */}
      <div style={bottomRowStyle}>
        <span style={bulkLabelStyle}>
          Trade Amount: <span style={bulkValueStyle}>{local.bulkAmount}</span>
        </span>
        <button
          style={local.money >= upgradeCost ? upgradeButtonStyle : upgradeDisabledStyle}
          onClick={() => {
            upgradeBulk();
            playUpgrade();
          }}
          disabled={local.money < upgradeCost}
        >
          UPGRADE (${upgradeCost.toLocaleString()})
        </button>
      </div>
    </div>
  );
}
