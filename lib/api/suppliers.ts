import { Supplier } from "@/types/Supplier";

// In src/lib/api/suppliers.ts
export type SuppliersQueryParams = {
  page?: number;
  pageSize?: number;
  q?: string;
};

export async function getSuppliersApi(params?: SuppliersQueryParams) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set("page", String(params.page));
  if (params?.pageSize) sp.set("pageSize", String(params.pageSize));
  if (params?.q) sp.set("q", params.q);

  const qs = sp.toString();
  const res = await fetch(`/api/suppliers${qs ? `?${qs}` : ""}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Failed to fetch suppliers");
  return {
    suppliers: (data.suppliers ?? data.items ?? []) as Supplier[],
    total: (data.total ?? 0) as number,
    totalAll: (data.totalAll ?? 0) as number,
  };
}

export async function saveSupplierApi(
  supplier: Partial<Supplier>,
): Promise<Supplier> {
  const isUpdate = Boolean(supplier.id);
  const method = isUpdate ? "PUT" : "POST";

  const res = await fetch("/api/suppliers", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(supplier),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to save supplier");
  }

  const data = await res.json();
  return data.supplier;
}

export async function deleteSupplierApi(id: string): Promise<void> {
  const res = await fetch(`/api/suppliers?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to delete supplier");
  }
}
