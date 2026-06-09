import { useEffect, useRef, useState } from "react";
import { PageStack } from "../components/PageStack";
import { mealSlots, weekdays } from "../data";
import type { MealPlanMonth, MealSlot, Weekday } from "../types";
import styles from "./RegimePage.module.css";

function computeCurrentDay(startDate: string): Weekday {
  if (!startDate) return "ДЕН 1";
  const start = new Date(startDate);
  const today = new Date();
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diffMs = today.getTime() - start.getTime();
  if (diffMs < 0) return "ДЕН 1";
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const dayIndex = diffDays % 7;
  return weekdays[dayIndex];
}

interface RegimePageProps {
  mealPlanMonths: MealPlanMonth[];
  activeMonthId: string;
  onMonthChange: (monthId: string) => void;
  updateMeal: (monthId: string, day: Weekday, meal: MealSlot, value: string) => void;
  isEditing: boolean;
  startDate: string;
}

export function RegimePage({
  mealPlanMonths,
  activeMonthId,
  updateMeal,
  isEditing,
  startDate,
}: RegimePageProps) {
  const [activeDay, setActiveDay] = useState<Weekday>(() => computeCurrentDay(startDate));
  const hasManuallySelectedDay = useRef(false);

  // Auto-update activeDay when startDate loads/changes (but not after manual click)
  useEffect(() => {
    if (hasManuallySelectedDay.current) return;
    setActiveDay(computeCurrentDay(startDate));
  }, [startDate]);

  function handleDayClick(day: Weekday) {
    hasManuallySelectedDay.current = true;
    setActiveDay(day);
  }

  const activeMonth = mealPlanMonths.find((m) => m.id === activeMonthId) ?? mealPlanMonths[0];
  const activeMealRow =
    activeMonth?.rows.find((row) => row.day === activeDay) ?? activeMonth?.rows[0];

  return (
    <PageStack>
      <section className={styles.dayTabs} aria-label="Избор на ден">
        {weekdays.map((day) => (
          <button
            key={day}
            type="button"
            className={day === activeDay ? styles.active : ""}
            onClick={() => handleDayClick(day)}
          >
            {day.replace(" ", "\u00a0")}
          </button>
        ))}
      </section>

      {activeMonth && activeMealRow ? (
        <section className={`panel ${styles.mealPanel}`}>
          <div className={styles.mealTable}>
            <div className={styles.mealTableHead}>
              {mealSlots.map((slot) => (
                <span key={slot}>{slot}</span>
              ))}
            </div>
            <div className={styles.mealTableRow}>
              {mealSlots.map((slot) => (
                <label className={styles.mealCell} key={slot}>
                  <span>{slot}</span>
                  {isEditing ? (
                    <textarea
                      value={activeMealRow.meals[slot]}
                      onChange={(e) =>
                        updateMeal(activeMonth.id, activeMealRow.day, slot, e.target.value)
                      }
                      placeholder="Ще добавим данни"
                    />
                  ) : (
                    <p
                      className={
                        activeMealRow.meals[slot].trim()
                          ? styles.mealText
                          : `${styles.mealText} ${styles.mealTextEmpty}`
                      }
                    >
                      {activeMealRow.meals[slot].trim() || "Ще добавим данни"}
                    </p>
                  )}
                </label>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </PageStack>
  );
}
