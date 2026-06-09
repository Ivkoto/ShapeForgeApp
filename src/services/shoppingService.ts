import { supabase } from "../clients/supabase";
import type { MonthlyShoppingList, ShoppingCategoryInfo, ShoppingItem } from "../types";

// ── DB row types ─────────────────────────────────────────────────────────────

interface DbShoppingCategory {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  icon_key: string | null;
  color_key: string | null;
  sort_order: number;
}

interface DbShoppingItem {
  id: string;
  user_id: string;
  month_id: string;
  category_id: string;
  name: string;
  quantity: string | null;
  is_checked: boolean;
  sort_order: number;
}

// ── Fetch shopping data ──────────────────────────────────────────────────────

export interface ShoppingData {
  categories: ShoppingCategoryInfo[];
  shoppingLists: MonthlyShoppingList[];
}

export async function fetchShoppingData(userId: string): Promise<ShoppingData> {
  if (!supabase) {
    return { categories: [], shoppingLists: [] };
  }

  const [categoriesRes, itemsRes] = await Promise.all([
    supabase
      .from("shopping_categories")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .returns<DbShoppingCategory[]>(),
    supabase
      .from("shopping_items")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .returns<DbShoppingItem[]>(),
  ]);

  if (categoriesRes.error) {
    throw new Error(`Грешка при зареждане на категории: ${categoriesRes.error.message}`);
  }
  if (itemsRes.error) {
    throw new Error(`Грешка при зареждане на продукти: ${itemsRes.error.message}`);
  }

  const dbCategories = categoriesRes.data ?? [];
  const dbItems = itemsRes.data ?? [];

  // Build category lookup: id → name
  const categoryById = new Map<string, string>();
  for (const cat of dbCategories) {
    categoryById.set(cat.id, cat.name);
  }

  // Map categories to ShoppingCategoryInfo[]
  const categories: ShoppingCategoryInfo[] = dbCategories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    iconKey: cat.icon_key ?? "",
    colorKey: cat.color_key ?? "",
    sortOrder: cat.sort_order,
  }));

  // Group items by month_id → MonthlyShoppingList[]
  const byMonth = new Map<string, ShoppingItem[]>();
  for (const item of dbItems) {
    const categoryName = categoryById.get(item.category_id) ?? "";
    const mapped: ShoppingItem = {
      id: item.id,
      category: categoryName as ShoppingItem["category"],
      categoryId: item.category_id,
      name: item.name,
      quantity: item.quantity ?? "",
      checked: item.is_checked,
    };

    const list = byMonth.get(item.month_id) ?? [];
    list.push(mapped);
    byMonth.set(item.month_id, list);
  }

  const shoppingLists: MonthlyShoppingList[] = Array.from(byMonth.entries()).map(
    ([monthId, items]) => ({ monthId, items }),
  );

  return { categories, shoppingLists };
}

// ── CRUD operations ──────────────────────────────────────────────────────────

export async function addShoppingItemToDb(
  userId: string,
  monthId: string,
  categoryId: string,
  item: { id: string; name: string; quantity: string; sortOrder: number },
): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase.from("shopping_items").insert({
    id: item.id,
    user_id: userId,
    month_id: monthId,
    category_id: categoryId,
    name: item.name,
    quantity: item.quantity || null,
    is_checked: false,
    sort_order: item.sortOrder,
  });

  if (error) {
    throw new Error(`Грешка при добавяне на продукт: ${error.message}`);
  }
}

export async function updateShoppingItemInDb(
  itemId: string,
  patch: { name?: string; quantity?: string; is_checked?: boolean; category_id?: string },
): Promise<void> {
  if (!supabase) return;

  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.quantity !== undefined) dbPatch.quantity = patch.quantity || null;
  if (patch.is_checked !== undefined) dbPatch.is_checked = patch.is_checked;
  if (patch.category_id !== undefined) dbPatch.category_id = patch.category_id;

  if (Object.keys(dbPatch).length === 0) return;

  const { error } = await supabase
    .from("shopping_items")
    .update(dbPatch)
    .eq("id", itemId);

  if (error) {
    throw new Error(`Грешка при обновяване на продукт: ${error.message}`);
  }
}

export async function deleteShoppingItemFromDb(itemId: string): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from("shopping_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    throw new Error(`Грешка при изтриване на продукт: ${error.message}`);
  }
}
