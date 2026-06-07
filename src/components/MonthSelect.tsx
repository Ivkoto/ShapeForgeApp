import type { MealPlanMonth } from "../types";

interface MonthSelectProps {
  activeMonthId: string;
  months: MealPlanMonth[];
  onChange: (monthId: string) => void;
}

export function MonthSelect({ activeMonthId, months, onChange }: MonthSelectProps) {
  return (
    <select
      className="month-select"
      value={activeMonthId}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Избор на месец"
    >
      {months.map((month) => (
        <option key={month.id} value={month.id}>
          {month.name}
        </option>
      ))}
    </select>
  );
}
