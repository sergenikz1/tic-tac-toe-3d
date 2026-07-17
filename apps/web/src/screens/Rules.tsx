import { useStore } from '../store.js';

export function Rules() {
  const navigate = useStore((s) => s.navigate);
  return (
    <div className="screen rules">
      <button className="btn-back" onClick={() => navigate('menu')}>
        ← Назад
      </button>
      <h2 className="select-title">ПРАВИЛА</h2>
      <div className="rules-card">
        <p>
          Поле — столбики N×N. Ты и бот по очереди нанизываете рыбок (тёмные и
          светлые), максимум N в высоту на каждый столбик. Нажимай на клетку
          нижней сетки — рыбка нырнёт на соответствующий столбик 3D-модели.
        </p>
        <p>
          Цель — собрать <strong>N своих рыбок в одну прямую линию</strong> в
          пространстве куба:
        </p>
        <ul>
          <li><strong>Вертикаль</strong> — стопка на одном столбике.</li>
          <li><strong>Ряд / столбец</strong> — горизонталь на одном уровне.</li>
          <li><strong>Диагональ слоя</strong> — по диагонали одного уровня.</li>
          <li><strong>Диагональ через слои</strong> — подъём в вертикальной плоскости.</li>
          <li><strong>Пространственная диагональ</strong> — из угла куба в противоположный.</li>
        </ul>
        <p>
          Режимы: <strong>3×3×3</strong> (легко, 49 линий), <strong>4×4×4</strong>{' '}
          (классика, 76 линий), <strong>5×5×5</strong> (сложно, 109 линий).
        </p>
        <p>
          На ход даётся <strong>1 минута</strong> — не успел, проиграл. Цветные
          полоски (🟢🔴🟡🔵) на гранях 3D-модели и рамке сетки помогают не
          потерять ориентацию при вращении.
        </p>
      </div>
    </div>
  );
}
