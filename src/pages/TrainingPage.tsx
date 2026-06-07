import { CalendarDays, Dumbbell, ListChecks, Plus, Target, Activity } from "lucide-react";
import { useState } from "react";
import { CollapsiblePanel } from "../components/CollapsiblePanel";
import { ExerciseEditor } from "../components/ExerciseEditor";
import { Field } from "../components/Field";
import { PageStack } from "../components/PageStack";
import { weekdays, workoutSectionTitles } from "../data";
import type { AppState, Exercise, Weekday } from "../types";
import styles from "./TrainingPage.module.css";

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

interface TrainingPageProps {
  trainingGoal: AppState["trainingGoal"];
  trainingMeta: AppState["trainingMeta"];
  weeklyTraining: AppState["weeklyTraining"];
  workouts: AppState["workouts"];
  absExercises: Exercise[];
  stretchingExercises: Exercise[];
  startDate: string;
  isEditing: boolean;
  updateTrainingGoalInfo: (info: string) => void;
  updateTrainingMeta: (patch: Partial<AppState["trainingMeta"]>) => void;
  updateWeeklyFocus: (day: Weekday, focus: string) => void;
  updateWorkoutExercise: (activeDay: Weekday, sectionId: string, exerciseId: string, patch: Partial<Exercise>) => void;
  addWorkoutExercise: (activeDay: Weekday, sectionId: string) => void;
  removeWorkoutExercise: (activeDay: Weekday, sectionId: string, exerciseId: string) => void;
  updateAbsExercise: (id: string, patch: Partial<Exercise>) => void;
  addAbsExercise: () => void;
  removeAbsExercise: (id: string) => void;
  updateStretchingExercise: (id: string, patch: Partial<Exercise>) => void;
  addStretchingExercise: () => void;
  removeStretchingExercise: (id: string) => void;
}

export function TrainingPage({
  trainingGoal,
  trainingMeta,
  weeklyTraining,
  workouts,
  absExercises,
  stretchingExercises,
  startDate,
  isEditing,
  updateTrainingGoalInfo,
  updateTrainingMeta,
  updateWeeklyFocus,
  updateWorkoutExercise,
  addWorkoutExercise,
  removeWorkoutExercise,
  updateAbsExercise,
  addAbsExercise,
  removeAbsExercise,
  updateStretchingExercise,
  addStretchingExercise,
  removeStretchingExercise,
}: TrainingPageProps) {
  const [activeDay, setActiveDay] = useState<Weekday>(() => computeCurrentDay(startDate));
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const activeWorkout = workouts.find((w) => w.day === activeDay) ?? workouts[0];

  function toggle(id: string) {
    setOpenSections((s) => ({ ...s, [id]: !s[id] }));
  }

  return (
    <PageStack>
      <div className="content-grid">
        <CollapsiblePanel
          icon={<span style={{ color: "#f59e0b" }}><Target size={18} /></span>}
          title="Цел"
          isOpen={!!openSections.goal}
          onToggle={() => toggle("goal")}
        >
          {isEditing ? (
            <textarea
              className="large-textarea"
              value={trainingGoal.info}
              onChange={(e) => updateTrainingGoalInfo(e.target.value)}
              aria-label="Цел на тренировъчния план"
            />
          ) : (
            <p className={styles.staticText}>{trainingGoal.info}</p>
          )}
          <ul className="compact-list">
            {trainingGoal.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </CollapsiblePanel>

        <CollapsiblePanel
          icon={<span style={{ color: "#3b82f6" }}><ListChecks size={18} /></span>}
          title="Определящи фактори"
          isOpen={!!openSections.meta}
          onToggle={() => toggle("meta")}
        >
          {isEditing ? (
            <>
              <Field
                label="BMR"
                value={trainingMeta.bmr}
                onChange={(v) => updateTrainingMeta({ bmr: v })}
              />
              <Field
                label="Спецификация"
                value={trainingMeta.specification}
                onChange={(v) => updateTrainingMeta({ specification: v })}
              />
              <label className="full-field">
                Забранени упражнения
                <textarea
                  value={trainingMeta.forbiddenExercises}
                  onChange={(e) => updateTrainingMeta({ forbiddenExercises: e.target.value })}
                  placeholder="Добави при нужда"
                />
              </label>
            </>
          ) : (
            <div className={styles.metaView}>
              <div className="info-block">
                <h3>BMR</h3>
                <p>{trainingMeta.bmr || "—"}</p>
              </div>
              <div className="info-block">
                <h3>Спецификация</h3>
                <p>{trainingMeta.specification || "—"}</p>
              </div>
              {trainingMeta.forbiddenExercises ? (
                <div className="info-block">
                  <h3>Забранени упражнения</h3>
                  <p>{trainingMeta.forbiddenExercises}</p>
                </div>
              ) : null}
            </div>
          )}
        </CollapsiblePanel>
      </div>

      <CollapsiblePanel
        icon={<span style={{ color: "#10b981" }}><CalendarDays size={18} /></span>}
        title="Седмична програма"
        isOpen={!!openSections.weekly}
        onToggle={() => toggle("weekly")}
      >
        <div className={styles.weekProgram}>
          {weeklyTraining.map((item) => (
            <label key={item.day}>
              <span>{item.day}</span>
              {isEditing ? (
                <input
                  value={item.focus}
                  onChange={(e) => updateWeeklyFocus(item.day, e.target.value)}
                />
              ) : (
                <strong>{item.focus || "—"}</strong>
              )}
            </label>
          ))}
        </div>
      </CollapsiblePanel>

      <section className={styles.dayTabs} aria-label="Избор на тренировъчен ден">
        {weekdays.map((day) => (
          <button
            key={day}
            type="button"
            className={day === activeDay ? styles.active : ""}
            onClick={() => setActiveDay(day)}
          >
            {day.replace(" ", "\u00a0")}
          </button>
        ))}
      </section>

      {activeWorkout ? (
        <CollapsiblePanel
          icon={<span style={{ color: "#dc2626" }}><Dumbbell size={18} /></span>}
          title={activeWorkout.heading}
          isOpen={!!openSections.workout}
          onToggle={() => toggle("workout")}
        >
          <div className={styles.workoutSections}>
            {activeWorkout.sections
              .slice()
              .sort(
                (a, b) =>
                  workoutSectionTitles.indexOf(a.title) -
                  workoutSectionTitles.indexOf(b.title)
              )
              .map((section) => (
                <article className={styles.workoutSection} key={section.id}>
                  <div className={styles.workoutSectionTitle}>
                    <h3>{section.title}</h3>
                    {isEditing && (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => addWorkoutExercise(activeDay, section.id)}
                      >
                        <Plus size={16} />
                        Добави
                      </button>
                    )}
                  </div>
                  <div className={styles.exerciseList}>
                    {section.exercises.map((exercise) =>
                      isEditing ? (
                        <ExerciseEditor
                          key={exercise.id}
                          exercise={exercise}
                          onChange={(patch) =>
                            updateWorkoutExercise(activeDay, section.id, exercise.id, patch)
                          }
                          onRemove={() =>
                            removeWorkoutExercise(activeDay, section.id, exercise.id)
                          }
                        />
                      ) : (
                        <article className="info-block" key={exercise.id}>
                          <h3>{exercise.name}</h3>
                          <p>{exercise.setsReps}</p>
                          {exercise.notes ? <small>{exercise.notes}</small> : null}
                        </article>
                      )
                    )}
                  </div>
                </article>
              ))}
          </div>
        </CollapsiblePanel>
      ) : null}

      <div className="content-grid">
        <CollapsiblePanel
          icon={<span style={{ color: "#8b5cf6" }}><Dumbbell size={18} /></span>}
          title="Коремни упражнения"
          isOpen={!!openSections.abs}
          onToggle={() => toggle("abs")}
        >
          <div className="item-list">
            {absExercises.map((exercise) =>
              isEditing ? (
                <ExerciseEditor
                  key={exercise.id}
                  exercise={exercise}
                  onChange={(patch) => updateAbsExercise(exercise.id, patch)}
                  onRemove={() => removeAbsExercise(exercise.id)}
                />
              ) : (
                <article className="info-block" key={exercise.id}>
                  <h3>{exercise.name}</h3>
                  <p>{exercise.setsReps}</p>
                  {exercise.notes ? <small>{exercise.notes}</small> : null}
                </article>
              )
            )}
          </div>
          {isEditing && (
            <button type="button" className="secondary-button" onClick={addAbsExercise}>
              <Plus size={16} />
              Добави
            </button>
          )}
        </CollapsiblePanel>

        <CollapsiblePanel
          icon={<span style={{ color: "#06b6d4" }}><Activity size={18} /></span>}
          title="Стречинг"
          isOpen={!!openSections.stretching}
          onToggle={() => toggle("stretching")}
        >
          <div className="item-list">
            {stretchingExercises.map((exercise) =>
              isEditing ? (
                <ExerciseEditor
                  key={exercise.id}
                  exercise={exercise}
                  onChange={(patch) => updateStretchingExercise(exercise.id, patch)}
                  onRemove={() => removeStretchingExercise(exercise.id)}
                />
              ) : (
                <article className="info-block" key={exercise.id}>
                  <h3>{exercise.name}</h3>
                  <p>{exercise.setsReps}</p>
                  {exercise.notes ? <small>{exercise.notes}</small> : null}
                </article>
              )
            )}
          </div>
          {isEditing && (
            <button type="button" className="secondary-button" onClick={addStretchingExercise}>
              <Plus size={16} />
              Добави
            </button>
          )}
        </CollapsiblePanel>
      </div>
    </PageStack>
  );
}
