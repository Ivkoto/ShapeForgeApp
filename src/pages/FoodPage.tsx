import { BookOpenText, CalendarDays, ChartLine, ExternalLink, ListChecks, Plus, Ruler, Trash2 } from "lucide-react";
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Legend, ResponsiveContainer } from "recharts";
import { CollapsiblePanel } from "../components/CollapsiblePanel";
import { MacroRow } from "../components/MacroRow";
import { PageStack } from "../components/PageStack";
import type { AdviceItem, BodyMeasurement, DailyTargets, InfoCardItem, Supplement } from "../types";
import styles from "./FoodPage.module.css";

interface FoodPageProps {
  startDate: string;
  dailyTargets: DailyTargets;
  supplements: Supplement[];
  advice: AdviceItem[];
  diningOutItems: InfoCardItem[];
  generalInfoItems: InfoCardItem[];
  bodyMeasurements: BodyMeasurement[];
  isEditing: boolean;
  updateStartDate: (date: string) => void;
  updateDailyTargets: (patch: Partial<DailyTargets>) => void;
  updateSupplement: (id: string, patch: Partial<Supplement>) => void;
  addSupplement: () => void;
  removeSupplement: (id: string) => void;
  updateAdviceItem: (id: string, patch: Partial<AdviceItem>) => void;
  addAdviceItem: () => void;
  removeAdviceItem: (id: string) => void;
  addBodyMeasurement: () => void;
  updateBodyMeasurement: (id: string, patch: Partial<BodyMeasurement>) => void;
  removeBodyMeasurement: (id: string) => void;
  updateDiningOutItem: (id: string, patch: Partial<Omit<InfoCardItem, "id">>) => void;
  addDiningOutItem: () => void;
  removeDiningOutItem: (id: string) => void;
  updateGeneralInfoItem: (id: string, patch: Partial<Omit<InfoCardItem, "id">>) => void;
  addGeneralInfoItem: () => void;
  removeGeneralInfoItem: (id: string) => void;
}

export function FoodPage({
  startDate,
  dailyTargets,
  supplements,
  advice,
  diningOutItems,
  generalInfoItems,
  bodyMeasurements,
  isEditing,
  updateStartDate,
  updateDailyTargets,
  updateSupplement,
  addSupplement,
  removeSupplement,
  updateAdviceItem,
  addAdviceItem,
  removeAdviceItem,
  addBodyMeasurement,
  updateBodyMeasurement,
  removeBodyMeasurement,
  updateDiningOutItem,
  addDiningOutItem,
  removeDiningOutItem,
  updateGeneralInfoItem,
  addGeneralInfoItem,
  removeGeneralInfoItem,
}: FoodPageProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  function toggle(id: string) {
    setOpenSections((s) => ({ ...s, [id]: !s[id] }));
  }

  function sanitizeNumericInput(value: string) {
    return value.replace(/[^0-9]/g, "");
  }

  return (
    <PageStack>
      <section className="panel">
        <div className={styles.startDateHeader}>
          <div className={styles.startDateContent}>
            <CalendarDays size={18} />
            {isEditing ? (
              <input
                type="date"
                value={startDate}
                onChange={(e) => updateStartDate(e.target.value)}
                aria-label="Начална дата на режима"
              />
            ) : startDate ? (
              <span className={styles.startDateInfo}>
                Режимът започна на {new Date(startDate).toLocaleDateString("bg-BG")}
              </span>
            ) : (
              <span className={styles.startDateWarning}>
                Моля изберете стартова дата за режима.
              </span>
            )}
          </div>
        </div>
      </section>

      <CollapsiblePanel
        icon={<Ruler size={18} />}
        title="Измервания"
        isOpen={!!openSections.measurements}
        onToggle={() => toggle("measurements")}
      >
        {isEditing ? (
          <>
            <button
              type="button"
              className="secondary-button"
              onClick={addBodyMeasurement}
            >
              <Plus size={16} />
              Добави измерване
            </button>
            {bodyMeasurements.length > 0 ? (
              <div className={styles.measurementsList}>
                {bodyMeasurements.map((m, index) => (
                  <MeasurementCard
                    key={m.id}
                    measurement={m}
                    isEditing={isEditing}
                    onUpdate={updateBodyMeasurement}
                    onRemove={removeBodyMeasurement}
                    isFirst={index === 0}
                  />
                ))}
              </div>
            ) : (
              <p className={styles.emptyText}>Няма записани замервания.</p>
            )}
          </>
        ) : (
          <>
            {bodyMeasurements.length >= 2 && (
              <>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => toggle("chart")}
                >
                  <ChartLine size={16} />
                  {openSections.chart ? "Скрий графика" : "Графика"}
                </button>
                {openSections.chart && (
                  <MeasurementChart measurements={bodyMeasurements} />
                )}
              </>
            )}
            {bodyMeasurements.length > 0 ? (
              <details className={styles.olderMeasurements}>
                <summary>Измервания ({bodyMeasurements.length})</summary>
                <div className={styles.measurementsList}>
                  {bodyMeasurements.map((m) => (
                    <MeasurementCard
                      key={m.id}
                      measurement={m}
                      isEditing={false}
                      onUpdate={updateBodyMeasurement}
                      onRemove={removeBodyMeasurement}
                    />
                  ))}
                </div>
              </details>
            ) : (
              <p className={styles.emptyText}>Няма записани замервания.</p>
            )}
          </>
        )}
      </CollapsiblePanel>

      <div className="content-grid">
        <CollapsiblePanel
          icon={<ListChecks size={18} />}
          title="Дневен калориен прием"
          isOpen={!!openSections.targets}
          onToggle={() => toggle("targets")}
        >
          {isEditing ? (
            <div className={styles.macroEditor}>
              <div className={styles.calorieRow}>
                <strong className={styles.rowTitle}>Калориен прием</strong>
                <div className={styles.fieldGroup}>
                  <input
                    inputMode="numeric"
                    value={dailyTargets.calories}
                    onChange={(e) => updateDailyTargets({ calories: sanitizeNumericInput(e.target.value) })}
                    aria-label="Калории"
                  />
                  <span>ккал</span>
                </div>
                <div className={styles.fieldGroup}>
                  <input
                    inputMode="numeric"
                    value={dailyTargets.deviation}
                    onChange={(e) => updateDailyTargets({ deviation: sanitizeNumericInput(e.target.value) })}
                    aria-label="Отклонение"
                  />
                  <span>±</span>
                </div>
              </div>
              <MacroRow
                title="Въглехидрати"
                percent={dailyTargets.carbsPercent}
                calories={dailyTargets.carbsCalories}
                grams={dailyTargets.carbsGrams}
                onChange={(p) =>
                  updateDailyTargets({
                    carbsPercent: sanitizeNumericInput(p.percent ?? dailyTargets.carbsPercent),
                    carbsCalories: sanitizeNumericInput(p.calories ?? dailyTargets.carbsCalories),
                    carbsGrams: sanitizeNumericInput(p.grams ?? dailyTargets.carbsGrams),
                  })
                }
              />
              <MacroRow
                title="Белтъчини"
                percent={dailyTargets.proteinPercent}
                calories={dailyTargets.proteinCalories}
                grams={dailyTargets.proteinGrams}
                onChange={(p) =>
                  updateDailyTargets({
                    proteinPercent: sanitizeNumericInput(p.percent ?? dailyTargets.proteinPercent),
                    proteinCalories: sanitizeNumericInput(p.calories ?? dailyTargets.proteinCalories),
                    proteinGrams: sanitizeNumericInput(p.grams ?? dailyTargets.proteinGrams),
                  })
                }
              />
              <MacroRow
                title="Мазнини"
                percent={dailyTargets.fatPercent}
                calories={dailyTargets.fatCalories}
                grams={dailyTargets.fatGrams}
                onChange={(p) =>
                  updateDailyTargets({
                    fatPercent: sanitizeNumericInput(p.percent ?? dailyTargets.fatPercent),
                    fatCalories: sanitizeNumericInput(p.calories ?? dailyTargets.fatCalories),
                    fatGrams: sanitizeNumericInput(p.grams ?? dailyTargets.fatGrams),
                  })
                }
              />
              <label className="full-field">
                Вода
                <textarea
                  value={dailyTargets.water}
                  onChange={(e) => updateDailyTargets({ water: e.target.value })}
                  aria-label="Вода"
                />
              </label>
            </div>
          ) : (
            <DailyTargetsView targets={dailyTargets} />
          )}
        </CollapsiblePanel>

        <CollapsiblePanel
          icon={<ExternalLink size={18} />}
          title="Препоръчителни добавки"
          isOpen={!!openSections.supplements}
          onToggle={() => toggle("supplements")}
        >
          {isEditing ? (
            <div className={styles.supplementEditList}>
              {supplements.map((supplement) => (
                <article className={styles.miniCard} key={supplement.id}>
                  <input
                    value={supplement.name}
                    onChange={(e) => updateSupplement(supplement.id, { name: e.target.value })}
                    aria-label="Наименование"
                    placeholder="Наименование"
                  />
                  <input
                    value={supplement.url}
                    onChange={(e) => updateSupplement(supplement.id, { url: e.target.value })}
                    aria-label="Линк"
                    placeholder="Линк"
                  />
                  <textarea
                    value={supplement.intake}
                    onChange={(e) => updateSupplement(supplement.id, { intake: e.target.value })}
                    aria-label="Прием"
                    placeholder="Прием"
                  />
                  <button
                    type="button"
                    className="icon-button danger"
                    onClick={() => removeSupplement(supplement.id)}
                    aria-label="Изтрий добавка"
                  >
                    <Trash2 size={16} />
                  </button>
                </article>
              ))}
              <button
                type="button"
                className="secondary-button"
                onClick={addSupplement}
              >
                <Plus size={16} />
                Добави добавка
              </button>
            </div>
          ) : (
            <SupplementsView supplements={supplements} />
          )}
        </CollapsiblePanel>
      </div>

      <div className="content-grid">
        <CollapsiblePanel
          icon={<BookOpenText size={18} />}
          title="Съвети"
          isOpen={!!openSections.advice}
          onToggle={() => toggle("advice")}
        >
          {isEditing ? (
            <div className={styles.supplementEditList}>
              {advice.map((item) => (
                <div className={styles.adviceRow} key={item.id}>
                  <input
                    value={item.body}
                    onChange={(e) => updateAdviceItem(item.id, { body: e.target.value })}
                    placeholder="Съвет"
                    aria-label="Съвет"
                  />
                  <button
                    type="button"
                    className="icon-button danger"
                    onClick={() => removeAdviceItem(item.id)}
                    aria-label="Изтрий съвет"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="secondary-button"
                onClick={addAdviceItem}
              >
                <Plus size={16} />
                Добави съвет
              </button>
            </div>
          ) : (
            <ul className="compact-list">
              {advice.map((item) => (
                <li key={item.id}>{item.body}</li>
              ))}
            </ul>
          )}
        </CollapsiblePanel>

        <CollapsiblePanel
          icon={<BookOpenText size={18} />}
          title="Хранене навън"
          isOpen={!!openSections.dining}
          onToggle={() => toggle("dining")}
        >
          {isEditing ? (
            <div className={styles.supplementEditList}>
              {diningOutItems.map((item) => (
                <article className={styles.miniCard} key={item.id}>
                  <input
                    value={item.title}
                    onChange={(e) => updateDiningOutItem(item.id, { title: e.target.value })}
                    placeholder="Заглавие"
                    aria-label="Заглавие"
                  />
                  <textarea
                    className="large-textarea"
                    value={item.body}
                    onChange={(e) => updateDiningOutItem(item.id, { body: e.target.value })}
                    placeholder="Текст"
                    aria-label="Текст"
                  />
                  <input
                    value={item.accent}
                    onChange={(e) => updateDiningOutItem(item.id, { accent: e.target.value })}
                    placeholder="Допълнителен акцент (по избор)"
                    aria-label="Акцент"
                  />
                  <button
                    type="button"
                    className="icon-button danger"
                    onClick={() => removeDiningOutItem(item.id)}
                    aria-label="Изтрий карта"
                  >
                    <Trash2 size={16} />
                  </button>
                </article>
              ))}
              <button
                type="button"
                className="secondary-button"
                onClick={addDiningOutItem}
              >
                <Plus size={16} />
                Добави карта
              </button>
            </div>
          ) : (
            <InfoCardList items={diningOutItems} emptyText="Няма добавени препоръки." />
          )}
        </CollapsiblePanel>
      </div>

      <CollapsiblePanel
        icon={<BookOpenText size={18} />}
        title="Обща информация"
        isOpen={!!openSections.generalInfo}
        onToggle={() => toggle("generalInfo")}
      >
        {isEditing ? (
          <div className={styles.supplementEditList}>
            {generalInfoItems.map((item) => (
              <article className={styles.miniCard} key={item.id}>
                <input
                  value={item.title}
                  onChange={(e) => updateGeneralInfoItem(item.id, { title: e.target.value })}
                  placeholder="Заглавие"
                  aria-label="Заглавие"
                />
                <textarea
                  className="large-textarea"
                  value={item.body}
                  onChange={(e) => updateGeneralInfoItem(item.id, { body: e.target.value })}
                  placeholder="Текст"
                  aria-label="Текст"
                />
                <input
                  value={item.accent}
                  onChange={(e) => updateGeneralInfoItem(item.id, { accent: e.target.value })}
                  placeholder="Допълнителен акцент (по избор)"
                  aria-label="Акцент"
                />
                <button
                  type="button"
                  className="icon-button danger"
                  onClick={() => removeGeneralInfoItem(item.id)}
                  aria-label="Изтрий карта"
                >
                  <Trash2 size={16} />
                </button>
              </article>
            ))}
            <button
              type="button"
              className="secondary-button"
              onClick={addGeneralInfoItem}
            >
              <Plus size={16} />
              Добави карта
            </button>
          </div>
        ) : (
          <InfoCardList items={generalInfoItems} emptyText="Няма добавена информация." />
        )}
      </CollapsiblePanel>
    </PageStack>
  );
}

function DailyTargetsView({ targets }: { targets: DailyTargets }) {
  return (
    <div className={styles.targetSummary}>
      <div className={styles.targetHero}>
        <span>Дневен прием</span>
        <strong>{targets.calories || "0"} ккал</strong>
        <small>Допустимо отклонение {targets.deviation ? `±${targets.deviation}%` : "—"}</small>
      </div>
      <div className={styles.targetMacroList}>
        <article>
          <span>Въглехидрати</span>
          <strong>{targets.carbsPercent}%</strong>
          <small>
            {targets.carbsCalories} ккал / {targets.carbsGrams} гр.
          </small>
        </article>
        <article>
          <span>Белтъчини</span>
          <strong>{targets.proteinPercent}%</strong>
          <small>
            {targets.proteinCalories} ккал / {targets.proteinGrams} гр.
          </small>
        </article>
        <article>
          <span>Мазнини</span>
          <strong>{targets.fatPercent}%</strong>
          <small>
            {targets.fatCalories} ккал / {targets.fatGrams} гр.
          </small>
        </article>
      </div>
      <p className={styles.waterNote}>{targets.water}</p>
    </div>
  );
}

function SupplementsView({ supplements }: { supplements: Supplement[] }) {
  return (
    <div className={styles.supplementSummary}>
      {supplements.map((supplement) => (
        <article className={styles.supplementCard} key={supplement.id}>
          <div>
            <h3>{supplement.name}</h3>
            <p>{supplement.intake}</p>
          </div>
          {supplement.url ? (
            <a
              className="icon-button"
              href={supplement.url}
              target="_blank"
              rel="noreferrer"
              aria-label={`Отвори ${supplement.name}`}
            >
              <ExternalLink size={16} />
            </a>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function InfoCardList({ items, emptyText }: { items: InfoCardItem[]; emptyText: string }) {
  if (items.length === 0) {
    return <p className={styles.emptyText}>{emptyText}</p>;
  }

  return (
    <div className={styles.macroInfoList}>
      {items.map((item) => (
        <article className="info-block" key={item.id}>
          <h3>{item.title}</h3>
          <p className={styles.formattedText}>{item.body}</p>
          {item.accent ? <strong>{item.accent}</strong> : null}
        </article>
      ))}
    </div>
  );
}

function MeasurementCard({
  measurement,
  isEditing,
  onUpdate,
  onRemove,
  isFirst,
}: {
  measurement: BodyMeasurement;
  isEditing: boolean;
  onUpdate: (id: string, patch: Partial<BodyMeasurement>) => void;
  onRemove: (id: string) => void;
  isFirst?: boolean;
}) {
  const labels: { key: keyof BodyMeasurement; label: string }[] = [
    { key: "height", label: "Ръст (см)" },
    { key: "neck", label: "Врат (см)" },
    { key: "waistNavel", label: "Талия на ниво пъп (см)" },
    { key: "waistAbove", label: "Талия 3см над пъпа (см)" },
    { key: "hips", label: "Ханш (см)" },
    { key: "thigh", label: "Бедро (см)" },
    { key: "calf", label: "Прасец (см)" },
    { key: "bicep", label: "Бицепс (см)" },
    { key: "bust", label: "Бюст (см)" },
  ];

  if (isEditing) {
    return (
      <div className={styles.measurementCard}>
        <div className={styles.measurementDateRow}>
          <input
            type="date"
            readOnly
            value={measurement.date}
            onChange={(e) => onUpdate(measurement.id, { date: e.target.value })}
            onClick={(e) => {
              e.currentTarget.showPicker?.();
            }}
            onKeyDown={(e) => {
              if (e.key !== "Tab") {
                e.preventDefault();
              }
            }}
            onPaste={(e) => e.preventDefault()}
            aria-label="Дата на замерване"
          />
          <button
            type="button"
            className="icon-button danger"
            onClick={() => onRemove(measurement.id)}
            aria-label="Изтрий замерване"
          >
            <Trash2 size={16} />
          </button>
        </div>
        <div className={styles.measurementFields}>
          {labels.map(({ key, label }) => (
            <label key={key} className={styles.measurementField}>
              <span>{label}</span>
              <input
                type="number"
                inputMode="numeric"
                value={measurement[key]}
                onChange={(e) => onUpdate(measurement.id, { [key]: e.target.value.replace(/[^0-9]/g, "") })}
                placeholder="—"
                readOnly={key === "height" && !isFirst}
              />
            </label>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.measurementCard}>
      <h4 className={styles.measurementDate}>
        {measurement.date
          ? new Date(measurement.date).toLocaleDateString("bg-BG")
          : "Без дата"}
      </h4>
      <div className={styles.measurementGrid}>
        {labels.map(({ key, label }) =>
          measurement[key] ? (
            <div key={key} className={styles.measurementItem}>
              <span>{label.replace(" (см)", "")}</span>
              <strong>{measurement[key]} см</strong>
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}

const chartLines: { key: keyof BodyMeasurement; label: string; color: string }[] = [
  { key: "neck", label: "Врат", color: "#f59e0b" },
  { key: "waistNavel", label: "Талия (пъп)", color: "#ef4444" },
  { key: "waistAbove", label: "Талия (над пъпа)", color: "#f97316" },
  { key: "hips", label: "Ханш", color: "#8b5cf6" },
  { key: "thigh", label: "Бедро", color: "#3b82f6" },
  { key: "calf", label: "Прасец", color: "#06b6d4" },
  { key: "bicep", label: "Бицепс", color: "#10b981" },
  { key: "bust", label: "Бюст", color: "#ec4899" },
];

function MeasurementChart({ measurements }: { measurements: BodyMeasurement[] }) {
  const data = [...measurements]
    .reverse()
    .map((m) => ({
      date: m.date ? new Date(m.date).toLocaleDateString("bg-BG", { day: "numeric", month: "short" }) : "",
      neck: m.neck ? Number(m.neck) : null,
      waistNavel: m.waistNavel ? Number(m.waistNavel) : null,
      waistAbove: m.waistAbove ? Number(m.waistAbove) : null,
      hips: m.hips ? Number(m.hips) : null,
      thigh: m.thigh ? Number(m.thigh) : null,
      calf: m.calf ? Number(m.calf) : null,
      bicep: m.bicep ? Number(m.bicep) : null,
      bust: m.bust ? Number(m.bust) : null,
    }));

  return (
    <div className={styles.chartContainer} style={{ pointerEvents: "none" }}>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} domain={["dataMin - 2", "dataMax + 2"]} />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          {chartLines.map(({ key, label, color }) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={label}
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
