import { Apple, Beef, Milk, Package, Plus, Trash2, Wheat } from "lucide-react";
import React from "react";
import { useState } from "react";
import { CollapsiblePanel } from "../components/CollapsiblePanel";
import { EmptyState } from "../components/EmptyState";
import { PageStack } from "../components/PageStack";
import { shoppingCategories } from "../data";
import type { MealPlanMonth, MonthlyShoppingList, ShoppingCategory, ShoppingItem } from "../types";
import styles from "./ShoppingPage.module.css";

const categoryConfig: Record<ShoppingCategory, { icon: React.ReactNode; color: string }> = {
  "ПЛОДОВЕ и ЗЕЛЕНЧУЦИ": { icon: <Apple size={18} />, color: "#16a34a" },
  "МЕСО, РИБА и ЯЙЦА": { icon: <Beef size={18} />, color: "#dc2626" },
  "МЛЕЧНИ ПРОДУКТИ": { icon: <Milk size={18} />, color: "#2563eb" },
  "ЗЪРНЕНИ, БОБОВИ, ЯДКИ и СЕМЕНА": { icon: <Wheat size={18} />, color: "#d97706" },
  "ДРУГИ": { icon: <Package size={18} />, color: "#7c3aed" },
};

interface ShoppingPageProps {
  mealPlanMonths: MealPlanMonth[];
  shoppingLists: MonthlyShoppingList[];
  activeMonthId: string;
  onMonthChange: (monthId: string) => void;
  isEditing: boolean;
  addShoppingItem: (monthId: string, category: ShoppingCategory) => void;
  updateShoppingItem: (id: string, patch: Partial<ShoppingItem>) => void;
  removeShoppingItem: (id: string) => void;
}

export function ShoppingPage({
  shoppingLists,
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
        {shoppingCategories.map((category) => {
          const items = activeShopping?.items.filter((item) => item.category === category) ?? [];
          return (
            <CollapsiblePanel
              key={category}
              icon={<span style={{ color: categoryConfig[category].color }}>{categoryConfig[category].icon}</span>}
              title={category}
              isOpen={!!openSections[category]}
              onToggle={() => toggle(category)}
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
                  onClick={() => addShoppingItem(activeMonthId, category)}
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
