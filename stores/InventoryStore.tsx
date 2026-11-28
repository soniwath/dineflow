"use client";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { InventoryItem, ItemInput, StockStatus } from "@/types/Inventory";
import { Supplier } from "@/types/Supplier";
import { MenuItem } from "@/types/Menu";
import {
  getInventoryItemsApi,
  saveInventoryItemApi,
  deleteInventoryItemApi,
  type InventoryQueryParams,
} from "@/lib/api/inventory";
import {
  getMenuItemsApi,
  saveMenuItemApi,
  updateMenuItemApi,
  deleteMenuItemApi,
  type MenuQueryParams,
} from "@/lib/api/menu";
import {
  getSuppliersApi,
  saveSupplierApi,
  deleteSupplierApi,
  type SuppliersQueryParams,
} from "@/lib/api/suppliers";
import { createNotificationApi } from "@/lib/api/notifications";

export const UNITS = [
  "pc",
  "lb",
  "kg",
  "oz",
  "l",
  "btl",
  "keg",
  "case",
] as const;

export const STATUS_LABEL: Record<StockStatus, string> = {
  "at-par": "At par",
  low: "Low",
  out: "Out of stock",
};

export function getStatus(item: InventoryItem): StockStatus {
  if (item.onHand <= 0) return "out";
  if (item.onHand <= item.lowAt) return "low";
  return "at-par";
}

type InventoryContextValue = {
  // Paginated current tab slices
  items: InventoryItem[];
  suppliers: Supplier[];
  menuItems: MenuItem[];

  // Unpaginated lookup lists (for dropdowns & cross-references)
  allItems: InventoryItem[];
  allSuppliers: Supplier[];

  // Totals & facet counts from backend
  itemsTotal: number;
  itemsTotalAll: number;
  statusCounts: Record<StockStatus, number>;
  supplierCounts: Record<string, number>;
  suppliersTotal: number;
  suppliersTotalAll: number;
  menuTotal: number;
  menuTotalAll: number;

  loading: boolean;
  tabLoading: boolean;

  loadData: () => Promise<void>;
  loadItemsPage: (params: InventoryQueryParams) => Promise<void>;
  loadSuppliersPage: (params: SuppliersQueryParams) => Promise<void>;
  loadMenuPage: (params: MenuQueryParams) => Promise<void>;

  addItem: (input: ItemInput) => Promise<void>;
  updateItem: (id: string, input: ItemInput) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  addSupplier: (supplier: Omit<Supplier, "id">) => Promise<void>;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => Promise<void>;
  removeSupplier: (id: string) => Promise<void>;
  addMenuItem: (item: MenuItem) => Promise<void>;
  updateMenuItem: (id: string, item: MenuItem) => Promise<void>;
  removeMenuItem: (id: string) => Promise<void>;
};

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [allItems, setAllItems] = useState<InventoryItem[]>([]);
  const [itemsTotal, setItemsTotal] = useState(0);
  const [itemsTotalAll, setItemsTotalAll] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<StockStatus, number>>(
    {
      "at-par": 0,
      low: 0,
      out: 0,
    },
  );
  const [supplierCounts, setSupplierCounts] = useState<Record<string, number>>(
    {},
  );

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [suppliersTotal, setSuppliersTotal] = useState(0);
  const [suppliersTotalAll, setSuppliersTotalAll] = useState(0);

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuTotal, setMenuTotal] = useState(0);
  const [menuTotalAll, setMenuTotalAll] = useState(0);

  const [loading, setLoading] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);

  // Track last query params per resource so mutations refresh the exact active page/filter
  const lastItemsQuery = useRef<InventoryQueryParams>({
    page: 1,
    pageSize: 10,
  });
  const lastSuppliersQuery = useRef<SuppliersQueryParams>({
    page: 1,
    pageSize: 10,
  });
  const lastMenuQuery = useRef<MenuQueryParams>({ page: 1, pageSize: 10 });

  const loadItemsPage = useCallback(async (params: InventoryQueryParams) => {
    lastItemsQuery.current = params;
    setTabLoading(true);
    try {
      const res = await getInventoryItemsApi(params);
      setItems(res.items);
      setItemsTotal(res.total);
      setItemsTotalAll(res.totalAll);
      setStatusCounts(res.statusCounts);
      setSupplierCounts(res.supplierCounts);
    } finally {
      setTabLoading(false);
    }
  }, []);

  const loadSuppliersPage = useCallback(
    async (params: SuppliersQueryParams) => {
      lastSuppliersQuery.current = params;
      setTabLoading(true);
      try {
        const res = await getSuppliersApi(params);
        setSuppliers(res.suppliers);
        setSuppliersTotal(res.total);
        setSuppliersTotalAll(res.totalAll);
      } finally {
        setTabLoading(false);
      }
    },
    [],
  );

  const loadMenuPage = useCallback(async (params: MenuQueryParams) => {
    lastMenuQuery.current = params;
    setTabLoading(true);
    try {
      const res = await getMenuItemsApi(params);
      setMenuItems(res.menu);
      setMenuTotal(res.total);
      setMenuTotalAll(res.totalAll);
    } finally {
      setTabLoading(false);
    }
  }, []);

  // Used by HomeView (loads unpaginated overview) and initializes dropdown lookup lists
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [invData, menuData, supplierData] = await Promise.all([
        getInventoryItemsApi(),
        getMenuItemsApi(),
        getSuppliersApi(),
      ]);
      setItems(invData.items);
      setAllItems(invData.items);
      setItemsTotal(invData.total);
      setItemsTotalAll(invData.totalAll);
      setStatusCounts(invData.statusCounts);
      setSupplierCounts(invData.supplierCounts);

      setMenuItems(menuData.menu);
      setMenuTotal(menuData.total);
      setMenuTotalAll(menuData.totalAll);

      setSuppliers(supplierData.suppliers);
      setAllSuppliers(supplierData.suppliers);
      setSuppliersTotal(supplierData.total);
      setSuppliersTotalAll(supplierData.totalAll);
    } catch (err) {
      console.error("Failed to load inventory, menu, or supplier data", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshLookups = useCallback(async () => {
    const [invAll, supAll] = await Promise.all([
      getInventoryItemsApi(),
      getSuppliersApi(),
    ]);
    setAllItems(invAll.items);
    setAllSuppliers(supAll.suppliers);
  }, []);

  const addItem = useCallback(
    async (input: ItemInput) => {
      const newItem = await saveInventoryItemApi(input);
      await Promise.all([
        loadItemsPage(lastItemsQuery.current),
        refreshLookups(),
      ]);

      const status = getStatus(newItem);
      if (status === "low" || status === "out") {
        await createNotificationApi({
          type: "inventory_alert",
          message: `New inventory item added: ${newItem.name} is ${STATUS_LABEL[status]}`,
          title: "Inventory Alert",
        });
      } else {
        await createNotificationApi({
          type: "inventory_alert",
          message: `New inventory item added: ${newItem.name}`,
          title: "Inventory Update",
        });
      }
    },
    [loadItemsPage, refreshLookups],
  );

  const updateItem = useCallback(
    async (id: string, input: ItemInput) => {
      const updated = await saveInventoryItemApi({ ...input, id });
      await Promise.all([
        loadItemsPage(lastItemsQuery.current),
        refreshLookups(),
      ]);

      const status = getStatus(updated);
      if (status === "low" || status === "out") {
        await createNotificationApi({
          type: "inventory_alert",
          message: `Inventory item updated: ${updated.name} is now ${STATUS_LABEL[status]}`,
          title: "Inventory Alert",
        });
      } else {
        await createNotificationApi({
          type: "inventory_alert",
          message: `Inventory item updated: ${updated.name} has been updated.`,
          title: "Inventory Update",
        });
      }
    },
    [loadItemsPage, refreshLookups],
  );

  const removeItem = useCallback(
    async (id: string) => {
      await deleteInventoryItemApi(id);
      await Promise.all([
        loadItemsPage(lastItemsQuery.current),
        refreshLookups(),
      ]);
    },
    [loadItemsPage, refreshLookups],
  );

  const addSupplier = useCallback(
    async (supplierData: Omit<Supplier, "id">) => {
      await saveSupplierApi(supplierData);
      await Promise.all([
        loadSuppliersPage(lastSuppliersQuery.current),
        refreshLookups(),
      ]);
    },
    [loadSuppliersPage, refreshLookups],
  );

  const updateSupplier = useCallback(
    async (id: string, supplierData: Partial<Supplier>) => {
      await saveSupplierApi({ ...supplierData, id });
      await Promise.all([
        loadSuppliersPage(lastSuppliersQuery.current),
        refreshLookups(),
      ]);
    },
    [loadSuppliersPage, refreshLookups],
  );

  const removeSupplier = useCallback(
    async (id: string) => {
      await deleteSupplierApi(id);
      await Promise.all([
        loadSuppliersPage(lastSuppliersQuery.current),
        refreshLookups(),
      ]);
    },
    [loadSuppliersPage, refreshLookups],
  );

  const addMenuItem = useCallback(
    async (item: MenuItem) => {
      await saveMenuItemApi(item);
      await loadMenuPage(lastMenuQuery.current);
    },
    [loadMenuPage],
  );

  const updateMenuItem = useCallback(
    async (id: string, item: MenuItem) => {
      await updateMenuItemApi({ ...item, id });
      await loadMenuPage(lastMenuQuery.current);
    },
    [loadMenuPage],
  );

  const removeMenuItem = useCallback(
    async (id: string) => {
      await deleteMenuItemApi(id);
      await loadMenuPage(lastMenuQuery.current);
    },
    [loadMenuPage],
  );

  const value = useMemo(
    () => ({
      items,
      suppliers,
      menuItems,
      allItems,
      allSuppliers,
      itemsTotal,
      itemsTotalAll,
      statusCounts,
      supplierCounts,
      suppliersTotal,
      suppliersTotalAll,
      menuTotal,
      menuTotalAll,
      loading,
      tabLoading,
      loadData,
      loadItemsPage,
      loadSuppliersPage,
      loadMenuPage,
      addItem,
      updateItem,
      removeItem,
      addSupplier,
      updateSupplier,
      removeSupplier,
      addMenuItem,
      updateMenuItem,
      removeMenuItem,
    }),
    [
      items,
      suppliers,
      menuItems,
      allItems,
      allSuppliers,
      itemsTotal,
      itemsTotalAll,
      statusCounts,
      supplierCounts,
      suppliersTotal,
      suppliersTotalAll,
      menuTotal,
      menuTotalAll,
      loading,
      tabLoading,
      loadData,
      loadItemsPage,
      loadSuppliersPage,
      loadMenuPage,
      addItem,
      updateItem,
      removeItem,
      addSupplier,
      updateSupplier,
      removeSupplier,
      addMenuItem,
      updateMenuItem,
      removeMenuItem,
    ],
  );

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx)
    throw new Error("useInventory must be used inside <InventoryProvider>");
  return ctx;
}
