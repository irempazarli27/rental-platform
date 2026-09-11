import type { Selectable } from "kysely";
import type { CategoriesTable } from "../../db/types";

type Category = Selectable<CategoriesTable>;

export interface CategoryDto {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  icon: string | null;
  defaultRiskLevel: string;
  sortOrder: number;
}

export function toCategoryDto(category: Category): CategoryDto {
  return {
    id: category.id,
    parentId: category.parent_id,
    name: category.name,
    slug: category.slug,
    icon: category.icon,
    defaultRiskLevel: category.default_risk_level,
    sortOrder: category.sort_order,
  };
}
