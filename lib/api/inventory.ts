import { InventoryItem, ItemInput, StockStatus } from "@/types/Inventory";

export type InventoryQueryParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  statuses?: string[];
  supplierIds?: string[];
};

export type InventoryPageResponse = {
  items: InventoryItem[];
  total: number;
  totalAll: number;
  statusCounts: Record<StockStatus, number>;
  supplierCounts: Record<string, number>;
};

function mapApiInventoryItem(item: InventoryItem): InventoryItem {
  return {
    ...item,
    name: typeof item.name === "string" ? item.name.trim() : item.name,
    unit: typeof item.unit === "string" ? item.unit.trim() : item.unit,
  };
}

export async function getInventoryItemsApi(
  params?: InventoryQueryParams,
): Promise<InventoryPageResponse> {
  const sp = new URLSearchParams();
  if (params?.page) sp.set("page", String(params.page));
  if (params?.pageSize) sp.set("pageSize", String(params.pageSize));
  if (params?.q) sp.set("q", params.q);
  params?.statuses?.forEach((s) => sp.append("status", s));
  params?.supplierIds?.forEach((id) => sp.append("supplierId", id));

  const qs = sp.toString();
  const res = await fetch(`/api/inventory-items${qs ? `?${qs}` : ""}`, {
    method: "GET",
    cache: "no-store", // Ensure we always get the latest data
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to fetch inventory");

  return {
    items: (data.items ?? []).map(mapApiInventoryItem),
    total: data.total ?? data.items?.length ?? 0,
    totalAll: data.totalAll ?? data.items?.length ?? 0,
    statusCounts: data.statusCounts ?? { "at-par": 0, low: 0, out: 0 },
    supplierCounts: data.supplierCounts ?? {},
  };
}

export async function saveInventoryItemApi(input: ItemInput & { id?: string }) {
  const res = await fetch("/api/inventory-items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to save inventory item");
  return mapApiInventoryItem(data.item);
}

export async function deleteInventoryItemApi(id: string): Promise<void> {
  const res = await fetch(`/api/inventory-items?id=${id}`, {
    method: "DELETE",
  });
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.message ?? "Failed to delete inventory item");
}
