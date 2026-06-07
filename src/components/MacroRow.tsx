import styles from "./MacroRow.module.css";

interface MacroRowProps {
  title: string;
  percent: string;
  calories: string;
  grams: string;
  onChange: (patch: { percent?: string; calories?: string; grams?: string }) => void;
}

export function MacroRow({ title, percent, calories, grams, onChange }: MacroRowProps) {
  return (
    <div className={styles.macroRow}>
      <strong className={styles.title}>{title}</strong>
      <div className={styles.fieldGroup}>
        <input value={percent} onChange={(e) => onChange({ percent: e.target.value })} aria-label={`${title} %`} />
        <span>%</span>
      </div>
      <div className={styles.fieldGroup}>
        <input value={calories} onChange={(e) => onChange({ calories: e.target.value })} aria-label={`${title} ккал`} />
        <span>ккал</span>
      </div>
      <div className={styles.fieldGroup}>
        <input value={grams} onChange={(e) => onChange({ grams: e.target.value })} aria-label={`${title} гр.`} />
        <span>гр.</span>
      </div>
    </div>
  );
}
