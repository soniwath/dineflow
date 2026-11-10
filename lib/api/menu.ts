import { MenuItem } from "@/types/Menu";

export async function getMenuItemsApi(): Promise<MenuItem[]> {
  const res = await fetch("/api/menu-items");
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to fetch menu items");
  return data.items;
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
