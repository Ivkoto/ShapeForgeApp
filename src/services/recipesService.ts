import { supabase } from "../clients/supabase";
import type { Ingredient, Recipe, RecipeGroup } from "../types";

// ── DB row types ─────────────────────────────────────────────────────────────

interface DbRecipeGroup {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  sort_order: number;
}

interface DbRecipe {
  id: string;
  user_id: string;
  group_id: string;
  name: string;
  preparation: string | null;
  servings: number | null;
  sort_order: number;
}

interface DbRecipeIngredient {
  id: string;
  user_id: string;
  recipe_id: string;
  name: string;
  quantity: string | null;
  sort_order: number;
}

interface DbRecipeMonth {
  recipe_id: string;
  month_id: string;
  user_id: string;
}

// ── Fetch all recipes data ───────────────────────────────────────────────────

export interface RecipesData {
  recipes: Recipe[];
  /** Map: groupId → group name (RecipeGroup) */
  groupIdToName: Map<string, RecipeGroup>;
  /** Map: group name → groupId */
  groupNameToId: Map<string, string>;
}

export async function fetchRecipesData(userId: string): Promise<RecipesData> {
  if (!supabase) {
    return { recipes: [], groupIdToName: new Map(), groupNameToId: new Map() };
  }

  const [groupsRes, recipesRes, ingredientsRes, monthsRes] = await Promise.all([
    supabase
      .from("recipe_groups")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .returns<DbRecipeGroup[]>(),
    supabase
      .from("recipes")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .returns<DbRecipe[]>(),
    supabase
      .from("recipe_ingredients")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .returns<DbRecipeIngredient[]>(),
    supabase
      .from("recipe_months")
      .select("*")
      .eq("user_id", userId)
      .returns<DbRecipeMonth[]>(),
  ]);

  if (groupsRes.error) {
    throw new Error(`Грешка при зареждане на групи рецепти: ${groupsRes.error.message}`);
  }
  if (recipesRes.error) {
    throw new Error(`Грешка при зареждане на рецепти: ${recipesRes.error.message}`);
  }
  if (ingredientsRes.error) {
    throw new Error(`Грешка при зареждане на съставки: ${ingredientsRes.error.message}`);
  }
  if (monthsRes.error) {
    throw new Error(`Грешка при зареждане на месеци за рецепти: ${monthsRes.error.message}`);
  }

  const groups = groupsRes.data ?? [];
  const dbRecipes = recipesRes.data ?? [];
  const dbIngredients = ingredientsRes.data ?? [];
  const dbRecipeMonths = monthsRes.data ?? [];

  // Build group lookup
  const groupIdToName = new Map<string, RecipeGroup>();
  const groupNameToId = new Map<string, string>();
  for (const g of groups) {
    groupIdToName.set(g.id, g.name as RecipeGroup);
    groupNameToId.set(g.name, g.id);
  }

  // Build ingredients lookup: recipeId → ingredients
  const ingredientsByRecipe = new Map<string, Ingredient[]>();
  for (const ing of dbIngredients) {
    const list = ingredientsByRecipe.get(ing.recipe_id) ?? [];
    list.push({ id: ing.id, text: ing.name });
    ingredientsByRecipe.set(ing.recipe_id, list);
  }

  // Build recipe-months lookup: recipeId → monthIds
  const monthsByRecipe = new Map<string, string[]>();
  for (const rm of dbRecipeMonths) {
    const list = monthsByRecipe.get(rm.recipe_id) ?? [];
    list.push(rm.month_id);
    monthsByRecipe.set(rm.recipe_id, list);
  }

  // Assemble recipes
  const recipes: Recipe[] = dbRecipes.map((r) => ({
    id: r.id,
    name: r.name,
    group: groupIdToName.get(r.group_id) ?? ("Закуска" as RecipeGroup),
    ingredients: ingredientsByRecipe.get(r.id) ?? [],
    preparation: r.preparation ?? "",
    monthIds: monthsByRecipe.get(r.id) ?? [],
  }));

  return { recipes, groupIdToName, groupNameToId };
}

// ── Recipe CRUD ──────────────────────────────────────────────────────────────

export async function addRecipeToDb(
  userId: string,
  groupId: string,
  recipe: { id: string; name: string; preparation: string; sortOrder: number },
): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase.from("recipes").insert({
    id: recipe.id,
    user_id: userId,
    group_id: groupId,
    name: recipe.name,
    preparation: recipe.preparation || null,
    servings: null,
    sort_order: recipe.sortOrder,
  });

  if (error) {
    throw new Error(`Грешка при добавяне на рецепта: ${error.message}`);
  }
}

export async function updateRecipeInDb(
  userId: string,
  recipeId: string,
  patch: { name?: string; preparation?: string },
): Promise<void> {
  if (!supabase) return;

  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.preparation !== undefined) dbPatch.preparation = patch.preparation || null;

  if (Object.keys(dbPatch).length === 0) return;

  const { error } = await supabase
    .from("recipes")
    .update(dbPatch)
    .eq("id", recipeId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Грешка при обновяване на рецепта: ${error.message}`);
  }
}

export async function deleteRecipeFromDb(userId: string, recipeId: string): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", recipeId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Грешка при изтриване на рецепта: ${error.message}`);
  }
}

// ── Ingredient CRUD ──────────────────────────────────────────────────────────

export async function addIngredientToDb(
  userId: string,
  recipeId: string,
  ingredient: { id: string; text: string; sortOrder: number },
): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase.from("recipe_ingredients").insert({
    id: ingredient.id,
    user_id: userId,
    recipe_id: recipeId,
    name: ingredient.text,
    quantity: null,
    sort_order: ingredient.sortOrder,
  });

  if (error) {
    throw new Error(`Грешка при добавяне на съставка: ${error.message}`);
  }
}

export async function updateIngredientInDb(
  userId: string,
  ingredientId: string,
  text: string,
): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from("recipe_ingredients")
    .update({ name: text })
    .eq("id", ingredientId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Грешка при обновяване на съставка: ${error.message}`);
  }
}

export async function deleteIngredientFromDb(userId: string, ingredientId: string): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from("recipe_ingredients")
    .delete()
    .eq("id", ingredientId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Грешка при изтриване на съставка: ${error.message}`);
  }
}
