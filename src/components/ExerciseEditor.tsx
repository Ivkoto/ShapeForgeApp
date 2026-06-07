import { ExternalLink, Image, Trash2 } from "lucide-react";
import type { Exercise } from "../types";
import styles from "./ExerciseEditor.module.css";

interface ExerciseEditorProps {
  exercise: Exercise;
  onChange: (patch: Partial<Exercise>) => void;
  onRemove: () => void;
}

export function ExerciseEditor({ exercise, onChange, onRemove }: ExerciseEditorProps) {
  return (
    <article className={styles.exerciseCard}>
      <div className={styles.exerciseMedia}>
        {exercise.pictureUrl ? (
          <img src={exercise.pictureUrl} alt="" />
        ) : (
          <Image size={28} />
        )}
      </div>
      <div className={styles.exerciseFields}>
        <input
          className="title-input"
          value={exercise.name}
          onChange={(e) => onChange({ name: e.target.value })}
          aria-label="Упражнение"
        />
        <input
          value={exercise.setsReps}
          onChange={(e) => onChange({ setsReps: e.target.value })}
          placeholder="Серии и повторения"
        />
        <details className={styles.mediaDetails}>
          <summary>Снимка и видео</summary>
          <input
            value={exercise.pictureUrl}
            onChange={(e) => onChange({ pictureUrl: e.target.value })}
            placeholder="Линк към снимка"
          />
          <div className={styles.videoLine}>
            <input
              value={exercise.videoUrl}
              onChange={(e) => onChange({ videoUrl: e.target.value })}
              placeholder="Линк към видео"
            />
            {exercise.videoUrl ? (
              <a
                className="icon-button"
                href={exercise.videoUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Отвори видео"
              >
                <ExternalLink size={16} />
              </a>
            ) : null}
          </div>
        </details>
        <textarea
          value={exercise.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Бележки"
        />
      </div>
      <button
        type="button"
        className="icon-button danger"
        onClick={onRemove}
        aria-label="Изтрий упражнение"
      >
        <Trash2 size={16} />
      </button>
    </article>
  );
}
