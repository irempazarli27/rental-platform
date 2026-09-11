import { apiRequest } from "./client";

export interface Category {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  icon: string | null;
  defaultRiskLevel: "low" | "medium" | "high";
  sortOrder: number;
}

export function listCategories() {
  return apiRequest<{ categories: Category[] }>("/api/categories", { auth: false });
}
