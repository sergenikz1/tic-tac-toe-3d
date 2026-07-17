import { useStore, type BoardSize } from '../store.js';

const MODES: { size: BoardSize; emoji: string; title: string; note: string; cls: string }[] = [
  { size: 3, emoji: '🐠', title: 'ЛЕГКО', note: 'Куб 3×3×3 — линия из 3', cls: 'mode-easy' },
  { size: 4, emoji: '🐟', title: 'КЛАССИКА', note: 'Куб 4×4×4 — линия из 4', cls: 'mode-classic' },
  { size: 5, emoji: '🦈', title: 'СЛОЖНО', note: 'Куб 5×5×5 — линия из 5', cls: 'mode-hard' },
];

export function SoloSelect() {
  const navigate = useStore((s) => s.navigate);
  const setSoloSize = useStore((s) => s.setSoloSize);

  return (
    <div className="screen solo-select">
      <button className="btn-back" onClick={() => navigate('menu')}>
        ← Назад
      </button>
      <h2 className="select-title">ВЫБЕРИ РЕЖИМ</h2>
      <div className="mode-cards">
        {MODES.map((m) => (
          <button
            key={m.size}
            className={`mode-card ${m.cls}`}
            onClick={() => {
              setSoloSize(m.size);
              navigate('solo');
            }}
          >
            <span className="mode-emoji">{m.emoji}</span>
            <span className="mode-title">{m.title}</span>
            <span className="mode-note">{m.note}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
