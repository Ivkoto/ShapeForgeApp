import { Apple, Beef, Milk, Package, Plus, Trash2, Wheat } from "lucide-react";
import React from "react";
import { useState } from "react";
import { CollapsiblePanel } from "../components/CollapsiblePanel";
import { EmptyState } from "../components/EmptyState";
import { PageStack } from "../components/PageStack";
import type { MealPlanMonth, MonthlyShoppingList, ShoppingCategory, ShoppingCategoryInfo, ShoppingItem } from "../types";
import styles from "./ShoppingPage.module.css";

const iconMap: Record<string, React.ReactNode> = {
  apple: <Apple size={18} />,
  beef: <Beef size={18} />,
  milk: <Milk size={18} />,
  wheat: <Wheat size={18} />,
  "shopping-basket": <Package size={18} />,
};

const colorMap: Record<string, string> = {
  purple: "#7c3aed",
  green: "#16a34a",
  red: "#dc2626",
  blue: "#2563eb",
  orange: "#d97706",
};

function getCategoryIcon(iconKey: string): React.ReactNode {
  return iconMap[iconKey] ?? <Package size={18} />;
}

function getCategoryColor(colorKey: string): string {
  return colorMap[colorKey] ?? "#7c3aed";
}

interface ShoppingPageProps {
  mealPlanMonths: MealPlanMonth[];
  shoppingLists: MonthlyShoppingList[];
  shoppingCategories: ShoppingCategoryInfo[];
  activeMonthId: string;
  onMonthChange: (monthId: string) => void;
  isEditing: boolean;
  addShoppingItem: (monthId: string, category: ShoppingCategory) => void;
  updateShoppingItem: (id: string, patch: Partial<ShoppingItem>) => void;
  removeShoppingItem: (id: string) => void;
}

export function ShoppingPage({
  shoppingLists,
  shoppingCategories,
  activeMonthId,
  isEditing,
  addShoppingItem,
  updateShoppingItem,
  removeShoppingItem,
}: ShoppingPageProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const activeShopping = shoppingLists.find((list) => list.monthId === activeMonthId);

  function toggle(id: string) {
    setOpenSections((s) => ({ ...s, [id]: !s[id] }));
  }

  return (
    <PageStack>
      <div className={styles.categoryGrid}>
        {shoppingCategories.map((cat) => {
          const items = activeShopping?.items.filter((item) => item.category === cat.name) ?? [];
          const icon = getCategoryIcon(cat.iconKey);
          const color = getCategoryColor(cat.colorKey);
          return (
            <CollapsiblePanel
              key={cat.id}
              icon={<span style={{ color }}>{icon}</span>}
              title={cat.name}
              isOpen={!!openSections[cat.id]}
              onToggle={() => toggle(cat.id)}
            >
              <div className={styles.shoppingList}>
                {items.length === 0 ? (
                  <EmptyState text="Няма продукти в тази категория." />
                ) : null}
                {items.map((item) => (
                  <div className={styles.shoppingRow} key={item.id}>
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) =>
                        updateShoppingItem(item.id, { checked: e.target.checked })
                      }
                      aria-label="Отметни продукт"
                    />
                    {isEditing ? (
                      <>
                        <input
                          className={styles.nameInput}
                          value={item.name}
                          onChange={(e) => updateShoppingItem(item.id, { name: e.target.value })}
                          placeholder="Продукт"
                        />
                        <input
                          className={styles.quantityInput}
                          value={item.quantity}
                          onChange={(e) =>
                            updateShoppingItem(item.id, { quantity: e.target.value })
                          }
                          placeholder="Кол."
                        />
                        <select
                          className={styles.categorySelect}
                          value={item.categoryId}
                          onChange={(e) => {
                            const newCat = shoppingCategories.find((c) => c.id === e.target.value);
                            if (newCat) {
                              updateShoppingItem(item.id, {
                                category: newCat.name as ShoppingCategory,
                                categoryId: newCat.id,
                              });
                            }
                          }}
                          aria-label="Категория"
                        >
                          {shoppingCategories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="icon-button danger"
                          onClick={() => removeShoppingItem(item.id)}
                          aria-label="Изтрий продукт"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    ) : (
                      <span className={item.checked ? styles.itemChecked : styles.itemText}>
                        {item.name || "—"}{item.quantity ? ` · ${item.quantity}` : ""}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {isEditing && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => addShoppingItem(activeMonthId, cat.name as ShoppingCategory)}
                >
                  <Plus size={16} />
                  Добави
                </button>
              )}
            </CollapsiblePanel>
          );
        })}
      </div>
    </PageStack>
  );
}
