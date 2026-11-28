import { MenuItem } from "@/types/Menu";

// In src/lib/api/menu.ts
export type MenuQueryParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  categories?: string[];
};

export async function getMenuItemsApi(params?: MenuQueryParams) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set("page", String(params.page));
  if (params?.pageSize) sp.set("pageSize", String(params.pageSize));
  if (params?.q) sp.set("q", params.q);
  params?.categories?.forEach((c) => sp.append("category", c));

  const qs = sp.toString();
  const res = await fetch(`/api/menu-items${qs ? `?${qs}` : ""}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to fetch menu items");
  return {
    menu: (data.menu ?? data.items ?? []) as MenuItem[],
    total: (data.total ?? 0) as number,
    totalAll: (data.totalAll ?? 0) as number,
  };
}

export async function saveMenuItemApi(item: MenuItem): Promise<MenuItem> {
  const formData = new FormData();

  // Append each property of the item to the FormData object
  Object.entries(item).forEach(([key, value]) => {
    if (value instanceof File || value instanceof Blob) {
      formData.append(key, value);
    } else if (Array.isArray(value)) {
      formData.append(key, JSON.stringify(value));
    } else if (value !== null && value !== undefined) {
      formData.append(key, String(value));
    }
  });

  const res = await fetch("/api/menu-items", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to save menu item");
  return data.item;
}

export async function updateMenuItemApi(item: MenuItem): Promise<MenuItem> {
  const formData = new FormData();

  // Append each property of the item to the FormData object
  Object.entries(item).forEach(([key, value]) => {
    if (value instanceof File || value instanceof Blob) {
      formData.append(key, value);
    } else if (Array.isArray(value)) {
      formData.append(key, JSON.stringify(value));
    } else if (value !== null && value !== undefined) {
      formData.append(key, String(value));
    }
  });

  // Convert price (float with 2 decimal places) to string with cents
  if (item.price !== undefined) {
    formData.set("price", (item.price * 100).toFixed(0));
  }

  const res = await fetch(`/api/menu-items`, {
    method: "PUT",
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to update menu item");
  return data.item;
}

export async function deleteMenuItemApi(id: string): Promise<void> {
  const res = await fetch(`/api/menu-items?id=${id}`, { method: "DELETE" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to delete menu item");
}
