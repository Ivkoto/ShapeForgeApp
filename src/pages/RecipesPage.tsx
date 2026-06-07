import { ArrowLeft, Coffee, Cookie, Plus, Soup, Trash2, UtensilsCrossed } from "lucide-react";
import React from "react";
import { useEffect, useRef, useState } from "react";
import { PageStack } from "../components/PageStack";
import type { Ingredient, Recipe, RecipeGroup } from "../types";
import styles from "./RecipesPage.module.css";

const recipeGroups: RecipeGroup[] = ["Закуска", "Снак", "Обяд", "Вечеря"];

const groupConfig: Record<RecipeGroup, { icon: React.ReactNode; color: string }> = {
  "Закуска": { icon: <Coffee size={24} />, color: "#f59e0b" },
  "Снак": { icon: <Cookie size={24} />, color: "#10b981" },
  "Обяд": { icon: <Soup size={24} />, color: "#3b82f6" },
  "Вечеря": { icon: <UtensilsCrossed size={24} />, color: "#8b5cf6" },
};

interface RecipesPageProps {
  recipes: Recipe[];
  isEditing: boolean;
  addRecipe: (group: RecipeGroup) => string;
  removeRecipe: (id: string) => void;
  updateRecipe: (id: string, patch: Partial<Recipe>) => void;
  addIngredient: (recipeId: string) => void;
  updateIngredient: (
    recipeId: string,
    ingredientId: string,
    patch: Partial<Pick<Ingredient, "text">>
  ) => void;
  removeIngredient: (recipeId: string, ingredientId: string) => void;
}

export function RecipesPage({
  recipes,
  isEditing,
  addRecipe,
  removeRecipe,
  updateRecipe,
  addIngredient,
  updateIngredient,
  removeIngredient,
}: RecipesPageProps) {
  const [activeGroup, setActiveGroup] = useState<RecipeGroup | null>(null);
  const [activeRecipeId, setActiveRecipeId] = useState<string | null>(null);
  const [isNewRecipe, setIsNewRecipe] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const activeRecipe = activeRecipeId
    ? recipes.find((r) => r.id === activeRecipeId) ?? null
    : null;

  useEffect(() => {
    if (isNewRecipe && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
      setIsNewRecipe(false);
    }
  }, [isNewRecipe]);

  function handleAddRecipe() {
    if (!activeGroup) return;
    const id = addRecipe(activeGroup);
    setActiveRecipeId(id);
    setIsNewRecipe(true);
  }

  // Level 1: Group cards
  if (!activeGroup) {
    return (
      <PageStack>
        <div className={styles.groupGrid}>
          {recipeGroups.map((group) => {
            const count = recipes.filter((r) => r.group === group).length;
            const { icon, color } = groupConfig[group];
            return (
              <button
                key={group}
                type="button"
                className={styles.groupCard}
                style={{ borderTopColor: color }}
                onClick={() => setActiveGroup(group)}
              >
                <span style={{ color }}>{icon}</span>
                <strong>{group}</strong>
                <span>{count} {count === 1 ? "рецепта" : "рецепти"}</span>
              </button>
            );
          })}
        </div>
      </PageStack>
    );
  }

  // Level 2: Recipe list within group
  if (!activeRecipeId) {
    const groupRecipes = recipes.filter((r) => r.group === activeGroup);
    return (
      <PageStack>
        <div className={styles.levelHeader}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => setActiveGroup(null)}
          >
            <ArrowLeft size={16} />
            Назад
          </button>
          <h2 className={styles.levelTitle}>{activeGroup}</h2>
          {isEditing && (
            <button type="button" className="secondary-button" onClick={handleAddRecipe}>
              <Plus size={16} />
              Добави
            </button>
          )}
        </div>
        <div className={styles.recipeList}>
          {groupRecipes.length === 0 ? (
            <p className={styles.emptyText}>Няма рецепти в тази група.</p>
          ) : null}
          {groupRecipes.map((recipe) => (
            <button
              key={recipe.id}
              type="button"
              className={styles.recipeCard}
              onClick={() => setActiveRecipeId(recipe.id)}
            >
              {recipe.name}
            </button>
          ))}
        </div>
      </PageStack>
    );
  }

  // Level 3: Recipe detail
  return (
    <PageStack>
      <div className={styles.levelHeader}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => setActiveRecipeId(null)}
        >
          <ArrowLeft size={16} />
          {activeGroup}
        </button>
      </div>

      {activeRecipe ? (
        <section className="panel">
          <div className={styles.recipeDetail}>
            {isEditing ? (
              <>
                <input
                  ref={nameInputRef}
                  className="title-input"
                  value={activeRecipe.name}
                  onChange={(e) => updateRecipe(activeRecipe.id, { name: e.target.value })}
                  aria-label="Наименование на рецептата"
                />
                <h3>Съставки</h3>
                <div className={styles.ingredientList}>
                  {activeRecipe.ingredients.map((ingredient) => (
                    <div className={styles.ingredientRow} key={ingredient.id}>
                      <input
                        value={ingredient.text}
                        onChange={(e) =>
                          updateIngredient(activeRecipe.id, ingredient.id, {
                            text: e.target.value,
                          })
                        }
                        placeholder="Продукт и количество"
                      />
                      <button
                        type="button"
                        className="icon-button danger"
                        onClick={() => removeIngredient(activeRecipe.id, ingredient.id)}
                        aria-label="Изтрий съставка"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => addIngredient(activeRecipe.id)}
                >
                  <Plus size={16} />
                  Добави съставка
                </button>
                <label className="full-field">
                  Приготвяне
                  <textarea
                    value={activeRecipe.preparation}
                    onChange={(e) =>
                      updateRecipe(activeRecipe.id, { preparation: e.target.value })
                    }
                  />
                </label>
                <button
                  type="button"
                  className="icon-button danger"
                  onClick={() => {
                    removeRecipe(activeRecipe.id);
                    setActiveRecipeId(null);
                  }}
                  aria-label="Изтрий рецепта"
                >
                  <Trash2 size={16} />
                </button>
              </>
            ) : (
              <>
                <h3 className={styles.recipeName}>{activeRecipe.name}</h3>
                <h4>Съставки</h4>
                <ul className="compact-list">
                  {activeRecipe.ingredients.map((ingredient) => (
                    <li key={ingredient.id}>{ingredient.text || "—"}</li>
                  ))}
                </ul>
                {activeRecipe.preparation ? (
                  <>
                    <h4>Приготвяне</h4>
                    <p className={styles.preparationText}>{activeRecipe.preparation}</p>
                  </>
                ) : null}
              </>
            )}
          </div>
        </section>
      ) : null}
    </PageStack>
  );
}
