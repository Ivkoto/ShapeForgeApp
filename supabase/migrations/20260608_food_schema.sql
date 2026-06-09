create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  plan_start_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_on date not null,
  height_cm numeric(6,2),
  neck_cm numeric(6,2),
  waist_navel_cm numeric(6,2),
  waist_above_cm numeric(6,2),
  hips_cm numeric(6,2),
  thigh_cm numeric(6,2),
  calf_cm numeric(6,2),
  bicep_cm numeric(6,2),
  bust_cm numeric(6,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint body_measurements_positive_values check (
    coalesce(height_cm, 0) >= 0
    and coalesce(neck_cm, 0) >= 0
    and coalesce(waist_navel_cm, 0) >= 0
    and coalesce(waist_above_cm, 0) >= 0
    and coalesce(hips_cm, 0) >= 0
    and coalesce(thigh_cm, 0) >= 0
    and coalesce(calf_cm, 0) >= 0
    and coalesce(bicep_cm, 0) >= 0
    and coalesce(bust_cm, 0) >= 0
  )
);

create table if not exists public.daily_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  calories integer,
  deviation_percent numeric(5,2),
  carbs_percent numeric(5,2),
  carbs_calories integer,
  carbs_grams numeric(7,2),
  protein_percent numeric(5,2),
  protein_calories integer,
  protein_grams numeric(7,2),
  fat_percent numeric(5,2),
  fat_calories integer,
  fat_grams numeric(7,2),
  water_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_targets_user_unique unique (user_id),
  constraint daily_targets_positive_values check (
    coalesce(calories, 0) >= 0
    and coalesce(deviation_percent, 0) >= 0
    and coalesce(carbs_percent, 0) >= 0
    and coalesce(carbs_calories, 0) >= 0
    and coalesce(carbs_grams, 0) >= 0
    and coalesce(protein_percent, 0) >= 0
    and coalesce(protein_calories, 0) >= 0
    and coalesce(protein_grams, 0) >= 0
    and coalesce(fat_percent, 0) >= 0
    and coalesce(fat_calories, 0) >= 0
    and coalesce(fat_grams, 0) >= 0
  )
);

create table if not exists public.supplements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  url text,
  intake text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.advice_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_info_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  section_key text not null,
  title text not null,
  body text not null,
  emphasis text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plan_info_cards_section_key_check check (section_key in ('eating_out', 'macros', 'general_info'))
);

create table if not exists public.program_months (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_number integer not null,
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_months_month_number_check check (month_number > 0),
  constraint program_months_user_month_unique unique (user_id, month_number)
);

create table if not exists public.meal_plan_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_id uuid not null references public.program_months(id) on delete cascade,
  day_number integer not null,
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meal_plan_days_day_number_check check (day_number between 1 and 7),
  constraint meal_plan_days_month_day_unique unique (month_id, day_number)
);

create table if not exists public.meal_plan_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day_id uuid not null references public.meal_plan_days(id) on delete cascade,
  meal_slot text not null,
  title text not null,
  subtitle text,
  highlight text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meal_plan_entries_slot_check check (meal_slot in ('breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner')),
  constraint meal_plan_entries_day_slot_unique unique (day_id, meal_slot)
);

create table if not exists public.shopping_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  icon_key text,
  color_key text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shopping_categories_user_slug_unique unique (user_id, slug)
);

create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_id uuid not null references public.program_months(id) on delete cascade,
  category_id uuid not null references public.shopping_categories(id) on delete cascade,
  name text not null,
  quantity text,
  is_checked boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipe_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null,
  icon_key text,
  color_key text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_groups_user_slug_unique unique (user_id, slug)
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.recipe_groups(id) on delete cascade,
  name text not null,
  preparation text,
  servings integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipes_servings_check check (servings is null or servings > 0)
);

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  name text not null,
  quantity text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipe_months (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  month_id uuid not null references public.program_months(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (recipe_id, month_id)
);

create index if not exists body_measurements_user_date_idx on public.body_measurements (user_id, measured_on desc);
create index if not exists supplements_user_sort_idx on public.supplements (user_id, sort_order);
create index if not exists advice_items_user_sort_idx on public.advice_items (user_id, sort_order);
create index if not exists plan_info_cards_user_section_sort_idx on public.plan_info_cards (user_id, section_key, sort_order);
create index if not exists program_months_user_sort_idx on public.program_months (user_id, sort_order);
create index if not exists meal_plan_days_user_month_day_idx on public.meal_plan_days (user_id, month_id, day_number);
create index if not exists meal_plan_days_month_idx on public.meal_plan_days (month_id);
create index if not exists meal_plan_entries_user_day_sort_idx on public.meal_plan_entries (user_id, day_id, sort_order);
create index if not exists meal_plan_entries_day_idx on public.meal_plan_entries (day_id);
create index if not exists shopping_categories_user_sort_idx on public.shopping_categories (user_id, sort_order);
create index if not exists shopping_items_user_month_category_sort_idx on public.shopping_items (user_id, month_id, category_id, sort_order);
create index if not exists shopping_items_category_idx on public.shopping_items (category_id);
create index if not exists recipe_groups_user_sort_idx on public.recipe_groups (user_id, sort_order);
create index if not exists recipes_user_group_sort_idx on public.recipes (user_id, group_id, sort_order);
create index if not exists recipes_group_idx on public.recipes (group_id);
create index if not exists recipe_ingredients_user_recipe_sort_idx on public.recipe_ingredients (user_id, recipe_id, sort_order);
create index if not exists recipe_ingredients_recipe_idx on public.recipe_ingredients (recipe_id);
create index if not exists recipe_months_user_month_idx on public.recipe_months (user_id, month_id);
create index if not exists recipe_months_month_idx on public.recipe_months (month_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists body_measurements_set_updated_at on public.body_measurements;
create trigger body_measurements_set_updated_at before update on public.body_measurements for each row execute function public.set_updated_at();

drop trigger if exists daily_targets_set_updated_at on public.daily_targets;
create trigger daily_targets_set_updated_at before update on public.daily_targets for each row execute function public.set_updated_at();

drop trigger if exists supplements_set_updated_at on public.supplements;
create trigger supplements_set_updated_at before update on public.supplements for each row execute function public.set_updated_at();

drop trigger if exists advice_items_set_updated_at on public.advice_items;
create trigger advice_items_set_updated_at before update on public.advice_items for each row execute function public.set_updated_at();

drop trigger if exists plan_info_cards_set_updated_at on public.plan_info_cards;
create trigger plan_info_cards_set_updated_at before update on public.plan_info_cards for each row execute function public.set_updated_at();

drop trigger if exists program_months_set_updated_at on public.program_months;
create trigger program_months_set_updated_at before update on public.program_months for each row execute function public.set_updated_at();

drop trigger if exists meal_plan_days_set_updated_at on public.meal_plan_days;
create trigger meal_plan_days_set_updated_at before update on public.meal_plan_days for each row execute function public.set_updated_at();

drop trigger if exists meal_plan_entries_set_updated_at on public.meal_plan_entries;
create trigger meal_plan_entries_set_updated_at before update on public.meal_plan_entries for each row execute function public.set_updated_at();

drop trigger if exists shopping_categories_set_updated_at on public.shopping_categories;
create trigger shopping_categories_set_updated_at before update on public.shopping_categories for each row execute function public.set_updated_at();

drop trigger if exists shopping_items_set_updated_at on public.shopping_items;
create trigger shopping_items_set_updated_at before update on public.shopping_items for each row execute function public.set_updated_at();

drop trigger if exists recipe_groups_set_updated_at on public.recipe_groups;
create trigger recipe_groups_set_updated_at before update on public.recipe_groups for each row execute function public.set_updated_at();

drop trigger if exists recipes_set_updated_at on public.recipes;
create trigger recipes_set_updated_at before update on public.recipes for each row execute function public.set_updated_at();

drop trigger if exists recipe_ingredients_set_updated_at on public.recipe_ingredients;
create trigger recipe_ingredients_set_updated_at before update on public.recipe_ingredients for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.body_measurements enable row level security;
alter table public.daily_targets enable row level security;
alter table public.supplements enable row level security;
alter table public.advice_items enable row level security;
alter table public.plan_info_cards enable row level security;
alter table public.program_months enable row level security;
alter table public.meal_plan_days enable row level security;
alter table public.meal_plan_entries enable row level security;
alter table public.shopping_categories enable row level security;
alter table public.shopping_items enable row level security;
alter table public.recipe_groups enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_months enable row level security;

drop policy if exists "Users can manage own profile" on public.profiles;
create policy "Users can manage own profile"
on public.profiles
for all
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Users can manage own body measurements" on public.body_measurements;
create policy "Users can manage own body measurements"
on public.body_measurements
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own daily targets" on public.daily_targets;
create policy "Users can manage own daily targets"
on public.daily_targets
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own supplements" on public.supplements;
create policy "Users can manage own supplements"
on public.supplements
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own advice items" on public.advice_items;
create policy "Users can manage own advice items"
on public.advice_items
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own plan info cards" on public.plan_info_cards;
create policy "Users can manage own plan info cards"
on public.plan_info_cards
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own program months" on public.program_months;
create policy "Users can manage own program months"
on public.program_months
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own meal plan days" on public.meal_plan_days;
create policy "Users can manage own meal plan days"
on public.meal_plan_days
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own meal plan entries" on public.meal_plan_entries;
create policy "Users can manage own meal plan entries"
on public.meal_plan_entries
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own shopping categories" on public.shopping_categories;
create policy "Users can manage own shopping categories"
on public.shopping_categories
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own shopping items" on public.shopping_items;
create policy "Users can manage own shopping items"
on public.shopping_items
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own recipe groups" on public.recipe_groups;
create policy "Users can manage own recipe groups"
on public.recipe_groups
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own recipes" on public.recipes;
create policy "Users can manage own recipes"
on public.recipes
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own recipe ingredients" on public.recipe_ingredients;
create policy "Users can manage own recipe ingredients"
on public.recipe_ingredients
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage own recipe months" on public.recipe_months;
create policy "Users can manage own recipe months"
on public.recipe_months
for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant usage on schema public to authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.body_measurements to authenticated;
grant select, insert, update, delete on public.daily_targets to authenticated;
grant select, insert, update, delete on public.supplements to authenticated;
grant select, insert, update, delete on public.advice_items to authenticated;
grant select, insert, update, delete on public.plan_info_cards to authenticated;
grant select, insert, update, delete on public.program_months to authenticated;
grant select, insert, update, delete on public.meal_plan_days to authenticated;
grant select, insert, update, delete on public.meal_plan_entries to authenticated;
grant select, insert, update, delete on public.shopping_categories to authenticated;
grant select, insert, update, delete on public.shopping_items to authenticated;
grant select, insert, update, delete on public.recipe_groups to authenticated;
grant select, insert, update, delete on public.recipes to authenticated;
grant select, insert, update, delete on public.recipe_ingredients to authenticated;
grant select, insert, update, delete on public.recipe_months to authenticated;
