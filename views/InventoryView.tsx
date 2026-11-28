"use client";
import { useMemo, useState, useEffect } from "react";

import { cn, money } from "@/lib/utils";
import {
  InventoryItem,
  ItemInput,
  StockStatus,
  FilterOption,
} from "@/types/Inventory";
import { Supplier, SupplierErrors } from "@/types/Supplier";
import { MenuItem, MenuErrors, MenuInventoryItem } from "@/types/Menu";
import { STATUS_LABEL, getStatus, useInventory } from "@/stores/InventoryStore";
import { createSupplierSchema } from "@/lib/validation/supplier";
import { createMenuSchema } from "@/lib/validation/menu";

import InventorySkeleton from "@/components/inventory/InventorySkeleton";
import StockBarComponent from "@/components/inventory/StockBarComponent";
import ExpiryCellComponent from "@/components/inventory/ExpiryCellComponent";
import RowActionsComponent from "@/components/inventory/RowActionsComponent";
import FilterPopoverComponent from "@/components/inventory/FilterPopoverComponent";
import StatusBadgeComponent from "@/components/StatusBadgeComponent";
import ItemFormComponent from "@/components/inventory/ItemFormComponent";
import FieldComponent from "@/components/FieldComponent";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  LayoutGrid,
  List,
  Plus,
  Search,
  Trash2,
  Loader2,
  Pencil,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const MAX_SIZE_B = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PAGE_SIZE = 10;
const AVAILABLE_CATEGORIES = ["Starters", "Mains", "Desserts", "Beverages"];

export default function InventoryView() {
  const {
    loading: isInventoryLoading,
    tabLoading,
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
    loadData,
  } = useInventory();

  const [tab, setTab] = useState("items");
  const [view, setView] = useState<"list" | "card">("list");

  // Per-tab backend filter & pagination state
  const [itemsQuery, setItemsQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [supplierFilter, setSupplierFilter] = useState<string[]>([]);
  const [itemsPage, setItemsPage] = useState(1);

  const [suppliersQuery, setSuppliersQuery] = useState("");
  const [suppliersPage, setSuppliersPage] = useState(1);

  const [menuQuery, setMenuQuery] = useState("");
  const [menuCategoryFilter, setMenuCategoryFilter] = useState<string[]>([]);
  const [menuPage, setMenuPage] = useState(1);

  // Lookup maps from full unpaginated lists (so page 2+ items/suppliers still resolve)
  const supplierName = useMemo(
    () => Object.fromEntries(allSuppliers.map((s) => [s.id, s.name])),
    [allSuppliers],
  );

  const itemById = useMemo(
    () => Object.fromEntries(allItems.map((i) => [i.id, i])),
    [allItems],
  );

  // Initial lookup load (populates allItems & allSuppliers for dropdowns/cross-refs)
  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Debounced backend fetching per tab
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadItemsPage({
        page: itemsPage,
        pageSize: PAGE_SIZE,
        q: itemsQuery.trim() || undefined,
        statuses: statusFilter,
        supplierIds: supplierFilter,
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [itemsPage, itemsQuery, statusFilter, supplierFilter, loadItemsPage]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSuppliersPage({
        page: suppliersPage,
        pageSize: PAGE_SIZE,
        q: suppliersQuery.trim() || undefined,
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [suppliersPage, suppliersQuery, loadSuppliersPage]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMenuPage({
        page: menuPage,
        pageSize: PAGE_SIZE,
        q: menuQuery.trim() || undefined,
        categories: menuCategoryFilter,
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [menuPage, menuQuery, menuCategoryFilter, loadMenuPage]);

  // Inventory Dialog States
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<InventoryItem | null>(null);

  // Inventory Detail States
  const [itemDetailId, setItemDetailId] = useState<string | null>(null);
  const [itemDetailOpen, setItemDetailOpen] = useState(false);

  const itemDetail = useMemo(
    () =>
      items.find((i) => i.id === itemDetailId) ??
      allItems.find((i) => i.id === itemDetailId) ??
      null,
    [items, allItems, itemDetailId],
  );

  const usedInMenu = useMemo(
    () =>
      itemDetail
        ? menuItems.filter((m) =>
            m.ingredients?.some((r) => r.inventoryItemId === itemDetail.id),
          )
        : [],
    [menuItems, itemDetail],
  );

  const openItemDetail = (item: InventoryItem) => {
    setItemDetailId(item.id);
    setItemDetailOpen(true);
  };

  const openAdd = () => {
    setEditing(null);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditing(item);
    setFormKey((k) => k + 1);
    setFormOpen(true);
  };

  const openDelete = (item: InventoryItem) => {
    setDeleting(item);
    setDeleteOpen(true);
  };

  function handleSave(input: ItemInput) {
    if (editing) void updateItem(editing.id, input);
    else void addItem(input);
    setFormOpen(false);
  }

  function confirmDelete() {
    if (deleting) void removeItem(deleting.id);
    setDeleteOpen(false);
  }

  // Supplier Dialog States
  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierErrors, setSupplierErrors] = useState<SupplierErrors>({});
  const [supplierNameInput, setSupplierNameInput] = useState("");
  const [supplierPhoneInput, setSupplierPhoneInput] = useState("");
  const [supplierEmailInput, setSupplierEmailInput] = useState("");
  const [supplierDeleteOpen, setSupplierDeleteOpen] = useState(false);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(
    null,
  );

  const openAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierErrors({});
    setSupplierNameInput("");
    setSupplierPhoneInput("");
    setSupplierEmailInput("");
    setSupplierFormOpen(true);
  };

  const openEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setSupplierErrors({});
    setSupplierNameInput(s.name);
    setSupplierPhoneInput(s.phone);
    setSupplierEmailInput(s.email);
    setSupplierFormOpen(true);
  };

  const openDeleteSupplier = (s: Supplier) => {
    setDeletingSupplier(s);
    setSupplierDeleteOpen(true);
  };

  function handleSaveSupplier(e: React.FormEvent) {
    e.preventDefault();
    const result = createSupplierSchema().safeParse({
      name: supplierNameInput,
      phone: supplierPhoneInput,
      email: supplierEmailInput,
    });

    if (!result.success) {
      const next: SupplierErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof SupplierErrors;
        next[key] ??= issue.message;
      }
      setSupplierErrors(next);
      return;
    }

    setSupplierErrors({});
    if (editingSupplier) {
      void updateSupplier(editingSupplier.id, result.data);
    } else {
      void addSupplier(result.data);
    }

    setSupplierFormOpen(false);
  }

  function confirmDeleteSupplier() {
    if (deletingSupplier) void removeSupplier(deletingSupplier.id);
    setSupplierDeleteOpen(false);
  }

  // Menu Item Dialog States
  const [menuFormOpen, setMenuFormOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
  const [menuErrors, setMenuErrors] = useState<MenuErrors>({});
  const [menuName, setMenuName] = useState("");
  const [menuPrice, setMenuPrice] = useState("");
  const [menuCategory, setMenuCategory] = useState("Starters");
  const [menuDesc, setMenuDesc] = useState("");
  const [menuImage, setMenuImage] = useState<File | null>(null);
  const [recipeIngredients, setRecipeIngredients] = useState<
    MenuInventoryItem[]
  >([]);
  const [menuDeleteOpen, setMenuDeleteOpen] = useState(false);
  const [deletingMenu, setDeletingMenu] = useState<MenuItem | null>(null);

  const preview = useMemo(
    () => (menuImage ? URL.createObjectURL(menuImage) : null),
    [menuImage],
  );

  const openAddMenu = () => {
    setEditingMenu(null);
    setMenuErrors({});
    setMenuName("");
    setMenuPrice("");
    setMenuCategory("Starters");
    setMenuDesc("");
    setRecipeIngredients([]);
    setMenuImage(null);
    setMenuFormOpen(true);
  };

  const openEditMenu = (m: MenuItem) => {
    setEditingMenu(m);
    setMenuErrors({});
    setMenuName(m.name);
    setMenuPrice((m.price / 100).toFixed(2));
    setMenuCategory(m.category ?? "Starters");
    setMenuDesc(m.desc ?? "");
    setRecipeIngredients(m.ingredients ?? []);
    setMenuImage(null);
    setMenuFormOpen(true);
  };

  const openDeleteMenu = (m: MenuItem) => {
    setDeletingMenu(m);
    setMenuDeleteOpen(true);
  };

  function handleSaveMenu(e: React.FormEvent) {
    e.preventDefault();
    const result = createMenuSchema().safeParse({
      name: menuName,
      price: parseFloat(menuPrice || "0"),
      category: menuCategory,
      image: menuImage,
      desc: menuDesc,
      ingredients: recipeIngredients,
    });

    if (!result.success) {
      const next: MenuErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join(",") as keyof MenuErrors;
        next[key] ??= issue.message;
      }
      setMenuErrors(next);
      return;
    }

    setMenuErrors({});

    if (editingMenu) {
      void updateMenuItem(editingMenu.id, {
        id: editingMenu.id,
        ...result.data,
      });
    } else {
      void addMenuItem({ id: "", ...result.data });
    }
    setMenuFormOpen(false);
    handleRemoveImage();
  }

  function confirmDeleteMenu() {
    if (deletingMenu) void removeMenuItem(deletingMenu.id);
    setMenuDeleteOpen(false);
  }

  // Helpers
  const qtyFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
  const qty = (n: number, unit: string) => `${qtyFmt.format(n)} ${unit}`;

  const statusBadge: Record<StockStatus, string> = {
    "at-par": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    low: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    out: "bg-red-500/15 text-red-700 dark:text-red-400",
  };

  const statusBar: Record<StockStatus, string> = {
    "at-par": "bg-emerald-500",
    low: "bg-amber-500",
    out: "bg-transparent",
  };

  const statusDot: Record<StockStatus, string> = {
    "at-par": "bg-emerald-500",
    low: "bg-amber-500",
    out: "bg-red-500",
  };

  // Global facet counts from backend
  const statusOptions: FilterOption[] = (
    ["at-par", "low", "out"] as StockStatus[]
  ).map((s) => ({
    value: s,
    label: STATUS_LABEL[s],
    dot: statusDot[s],
    count: statusCounts[s] ?? 0,
  }));

  const belowPar = (statusCounts.low ?? 0) + (statusCounts.out ?? 0);

  const supplierOptions: FilterOption[] = allSuppliers.map((s) => ({
    value: s.id,
    label: s.name,
    count: supplierCounts[s.id] ?? 0,
  }));

  const categoryOptions: FilterOption[] = AVAILABLE_CATEGORIES.map((c) => ({
    value: c,
    label: c,
    count: menuItems.filter((m) => m.category === c).length,
  }));

  const itemFiltersActive =
    itemsQuery.trim() !== "" ||
    statusFilter.length > 0 ||
    supplierFilter.length > 0;

  const supplierFiltersActive = suppliersQuery.trim() !== "";

  const menuFiltersActive =
    menuQuery.trim() !== "" || menuCategoryFilter.length > 0;

  function clearItemFilters() {
    setItemsQuery("");
    setStatusFilter([]);
    setSupplierFilter([]);
    setItemsPage(1);
  }

  function clearMenuFilters() {
    setMenuQuery("");
    setMenuCategoryFilter([]);
    setMenuPage(1);
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      console.error("Unsupported file type");
    } else if (file.size > MAX_SIZE_B) {
      console.error("File size exceeds 5MB");
    } else {
      setMenuImage(file);
    }
    input.value = "";
  };

  const handleRemoveImage = () => {
    setMenuImage(null);
  };

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  if (isInventoryLoading && allItems.length === 0) {
    return <InventorySkeleton />;
  }

  return (
    <div className="space-y-4">
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(String(v))}
        className="space-y-4"
      >
        {/* Tabs + dynamic add button */}
        <div className="flex flex-col lg:flex-row items-end lg:items-center justify-between gap-3">
          <TabsList className="w-full lg:w-3/4">
            <TabsTrigger
              value="items"
              className="cursor-pointer w-full gap-2 px-3"
            >
              Items
              <span className="text-xs tabular-nums text-muted-foreground">
                {itemsTotalAll}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="suppliers"
              className="cursor-pointer w-full gap-2 px-3"
            >
              Suppliers
              <span className="text-xs tabular-nums text-muted-foreground">
                {suppliersTotalAll}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="menu"
              className="cursor-pointer w-full gap-2 px-3"
            >
              Menu Catalog
              <span className="text-xs tabular-nums text-muted-foreground">
                {menuTotalAll}
              </span>
            </TabsTrigger>
          </TabsList>

          {tab === "items" && (
            <Button size="sm" onClick={openAdd} className="cursor-pointer">
              <Plus className="size-4" />
              Add item
            </Button>
          )}
          {tab === "suppliers" && (
            <Button
              size="sm"
              onClick={openAddSupplier}
              className="cursor-pointer"
            >
              <Plus className="size-4" />
              Add supplier
            </Button>
          )}
          {tab === "menu" && (
            <Button size="sm" onClick={openAddMenu} className="cursor-pointer">
              <Plus className="size-4" />
              Add menu item
            </Button>
          )}
        </div>

        {/* ---------------------------- Items ---------------------------- */}
        <TabsContent value="items" className="mt-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search ingredients or suppliers"
                className="pl-9"
                value={itemsQuery}
                onChange={(e) => {
                  setItemsQuery(e.target.value);
                  setItemsPage(1);
                }}
              />
            </div>

            <FilterPopoverComponent
              title="Status"
              options={statusOptions}
              selected={statusFilter}
              onChange={(v) => {
                setStatusFilter(v);
                setItemsPage(1);
              }}
            />
            <FilterPopoverComponent
              title="Supplier"
              options={supplierOptions}
              selected={supplierFilter}
              onChange={(v) => {
                setSupplierFilter(v);
                setItemsPage(1);
              }}
              searchable
            />

            {itemFiltersActive && (
              <Button variant="ghost" size="sm" onClick={clearItemFilters}>
                Clear all
              </Button>
            )}

            <div className="ml-auto flex items-center gap-2">
              {tabLoading && (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              )}
              {belowPar > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full bg-red-500/15 text-red-700 hover:bg-red-500/25"
                  onClick={() => {
                    setStatusFilter(["low", "out"]);
                    setItemsPage(1);
                  }}
                >
                  {belowPar} below par
                </Button>
              )}

              <ViewToggle view={view} onChange={setView} />
            </div>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {itemFiltersActive
                    ? "No items match your filters"
                    : "No items yet"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {itemFiltersActive
                    ? "Try a different search or clear the filters."
                    : "Add your first ingredient to start tracking stock."}
                </p>
              </div>
              {itemFiltersActive ? (
                <Button variant="outline" size="sm" onClick={clearItemFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button size="sm" onClick={openAdd}>
                  <Plus className="size-4" />
                  Add item
                </Button>
              )}
            </div>
          ) : view === "list" ? (
            <div className="overflow-hidden rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingredient</TableHead>
                    <TableHead>On hand</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer"
                      tabIndex={0}
                      onClick={() => openItemDetail(item)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.target === e.currentTarget)
                          openItemDetail(item);
                      }}
                    >
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <StockBarComponent
                            statusBar={statusBar}
                            item={item}
                            className="w-24"
                          />
                          <span className="tabular-nums">
                            {qty(item.onHand, item.unit)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadgeComponent
                          statusLabel={STATUS_LABEL}
                          statusBadge={statusBadge}
                          status={getStatus(item)}
                        />
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <RowActionsComponent
                          item={item}
                          onEdit={openEdit}
                          onDelete={openDelete}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((item) => {
                const status = getStatus(item);
                return (
                  <article
                    key={item.id}
                    className="flex flex-col gap-4 rounded-xl border bg-card p-4"
                    onClick={() => openItemDetail(item)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-medium">
                          {item.name}
                        </h3>
                        <p className="truncate text-xs text-muted-foreground">
                          {supplierName[item.supplierId]}
                        </p>
                      </div>
                      <StatusBadgeComponent
                        statusLabel={STATUS_LABEL}
                        statusBadge={statusBadge}
                        status={status}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xl font-semibold tabular-nums">
                          {qty(item.onHand, item.unit)}
                        </span>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          of {qty(item.par, item.unit)} par
                        </span>
                      </div>
                      <StockBarComponent statusBar={statusBar} item={item} />
                    </div>

                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Low-stock at
                        </dt>
                        <dd className="tabular-nums">
                          {qty(item.lowAt, item.unit)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Expires
                        </dt>
                        <dd>
                          <ExpiryCellComponent iso={item.expires} />
                        </dd>
                      </div>
                    </dl>

                    <div
                      className="mt-auto border-t pt-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RowActionsComponent
                        item={item}
                        onEdit={openEdit}
                        onDelete={openDelete}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <PaginationFooter
            page={itemsPage}
            pageSize={PAGE_SIZE}
            total={itemsTotal}
            onPageChange={setItemsPage}
          />
        </TabsContent>

        {/* -------------------------- Suppliers -------------------------- */}
        <TabsContent value="suppliers" className="mt-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search suppliers by name, email, or phone"
                className="pl-9"
                value={suppliersQuery}
                onChange={(e) => {
                  setSuppliersQuery(e.target.value);
                  setSuppliersPage(1);
                }}
              />
            </div>

            {supplierFiltersActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSuppliersQuery("");
                  setSuppliersPage(1);
                }}
              >
                Clear search
              </Button>
            )}

            {tabLoading && (
              <Loader2 className="ml-auto size-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {suppliers.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {supplierFiltersActive
                    ? "No suppliers match your search"
                    : "No suppliers yet"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {supplierFiltersActive
                    ? "Try a different keyword or clear the search."
                    : "Add your first supplier to manage your ingredient sources."}
                </p>
              </div>
              {supplierFiltersActive ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSuppliersQuery("");
                    setSuppliersPage(1);
                  }}
                >
                  Clear search
                </Button>
              ) : (
                <Button size="sm" onClick={openAddSupplier}>
                  <Plus className="size-4" />
                  Add supplier
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {suppliers.map((s) => {
                const theirs = allItems.filter((i) => i.supplierId === s.id);
                const low = theirs.filter(
                  (i) => getStatus(i) !== "at-par",
                ).length;
                return (
                  <article
                    key={s.id}
                    className="flex flex-col gap-3 rounded-xl border bg-card p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium">{s.name}</h3>
                      {low > 0 && (
                        <Badge
                          className={cn(
                            "rounded-full font-normal",
                            statusBadge.low,
                          )}
                        >
                          {low} below par
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {theirs.length} {theirs.length === 1 ? "item" : "items"}
                    </p>

                    <div className="mt-auto pt-2 flex items-center justify-between border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSupplierFilter([s.id]);
                          setStatusFilter([]);
                          setItemsQuery("");
                          setItemsPage(1);
                          setTab("items");
                        }}
                      >
                        View items
                      </Button>
                      <RowActionsComponent
                        item={s}
                        onEdit={openEditSupplier}
                        onDelete={openDeleteSupplier}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <PaginationFooter
            page={suppliersPage}
            pageSize={PAGE_SIZE}
            total={suppliersTotal}
            onPageChange={setSuppliersPage}
          />
        </TabsContent>

        {/* -------------------------- Menu Catalog -------------------------- */}
        <TabsContent value="menu" className="mt-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search dishes or categories"
                className="pl-9"
                value={menuQuery}
                onChange={(e) => {
                  setMenuQuery(e.target.value);
                  setMenuPage(1);
                }}
              />
            </div>

            <FilterPopoverComponent
              title="Category"
              options={categoryOptions}
              selected={menuCategoryFilter}
              onChange={(v) => {
                setMenuCategoryFilter(v);
                setMenuPage(1);
              }}
            />

            {menuFiltersActive && (
              <Button variant="ghost" size="sm" onClick={clearMenuFilters}>
                Clear all
              </Button>
            )}

            <div className="ml-auto flex items-center gap-2">
              {tabLoading && (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              )}
              <ViewToggle view={view} onChange={setView} />
            </div>
          </div>

          {menuItems.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {menuFiltersActive
                    ? "No menu items match your filters"
                    : "No menu items yet"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {menuFiltersActive
                    ? "Try a different search or clear the filters."
                    : "Add your first menu item to configure recipes and stock deduction."}
                </p>
              </div>
              {menuFiltersActive ? (
                <Button variant="outline" size="sm" onClick={clearMenuFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button size="sm" onClick={openAddMenu}>
                  <Plus className="size-4" />
                  Add menu item
                </Button>
              )}
            </div>
          ) : view === "list" ? (
            <div className="overflow-hidden rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dish Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Mapped Ingredients (Recipe)</TableHead>
                    <TableHead className="w-24">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menuItems.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>{m.category}</TableCell>
                      <TableCell className="tabular-nums font-semibold">
                        {money.format(m.price / 100)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {m.ingredients && m.ingredients.length > 0 ? (
                            m.ingredients.map((ing, idx) => {
                              const itemObj = itemById[ing.inventoryItemId];
                              return (
                                <Badge
                                  key={idx}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {itemObj ? itemObj.name : "Unknown"}:{" "}
                                  {ing.quantityRequired} {itemObj?.unit}
                                </Badge>
                              );
                            })
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              No recipe mapped
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <RowActionsComponent
                          item={m}
                          onEdit={openEditMenu}
                          onDelete={openDeleteMenu}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {menuItems.map((m) => (
                <article
                  key={m.id}
                  className="flex flex-col gap-4 rounded-xl border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-medium">{m.name}</h3>
                      <p className="truncate text-xs text-muted-foreground">
                        {m.category}
                      </p>
                    </div>
                    <span className="text-base font-semibold tabular-nums">
                      {money.format(m.price / 100)}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      Recipe Ingredients
                    </p>
                    <div className="flex flex-wrap gap-1 min-h-9">
                      {m.ingredients && m.ingredients.length > 0 ? (
                        m.ingredients.map((ing, idx) => {
                          const itemObj = itemById[ing.inventoryItemId];
                          return (
                            <Badge
                              key={idx}
                              variant="outline"
                              className="text-xs"
                            >
                              {itemObj ? itemObj.name : "Unknown"}:{" "}
                              {ing.quantityRequired} {itemObj?.unit}
                            </Badge>
                          );
                        })
                      ) : (
                        <span className="text-xs text-muted-foreground italic">
                          No recipe mapped
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto border-t pt-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground truncate max-w-37.5">
                      {m.desc || "No description"}
                    </span>
                    <RowActionsComponent
                      item={m}
                      onEdit={openEditMenu}
                      onDelete={openDeleteMenu}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}

          <PaginationFooter
            page={menuPage}
            pageSize={PAGE_SIZE}
            total={menuTotal}
            onPageChange={setMenuPage}
          />
        </TabsContent>
      </Tabs>

      {/* Add / Edit Inventory Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader className="border-b pb-4">
            <DialogTitle>
              {editing ? `Edit ${editing.name}` : "Add inventory item"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Changes update the list and stock alerts right away."
                : "New items appear in the list and start sending stock alerts right away."}
            </DialogDescription>
          </DialogHeader>
          <ItemFormComponent
            key={formKey}
            item={editing}
            onSubmit={handleSave}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Inventory Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove {deleting?.name}?</DialogTitle>
            <DialogDescription>
              This removes it from your inventory. You can&apos;t undo this.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button variant="destructive" onClick={confirmDelete}>
              Remove item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Supplier Dialog */}
      <Dialog open={supplierFormOpen} onOpenChange={setSupplierFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="border-b pb-4">
            <DialogTitle>
              {editingSupplier
                ? `Edit Supplier: ${editingSupplier.name}`
                : "Add Supplier"}
            </DialogTitle>
            <DialogDescription>
              {editingSupplier
                ? "Update the supplier's details."
                : "Add a new vendor source for your inventory items."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveSupplier} className="space-y-4 pt-2">
            <FieldComponent
              id="supplierName"
              label="Supplier Name"
              error={supplierErrors.name}
            >
              <Input
                value={supplierNameInput}
                onChange={(e) => setSupplierNameInput(e.target.value)}
                placeholder="e.g. Sysco Foods"
                aria-invalid={!!supplierErrors.name}
              />
            </FieldComponent>
            <FieldComponent
              id="supplierPhone"
              label="Supplier Phone"
              error={supplierErrors.phone}
            >
              <Input
                value={supplierPhoneInput}
                onChange={(e) => setSupplierPhoneInput(e.target.value)}
                placeholder="e.g. (555) 123-4567"
                aria-invalid={!!supplierErrors.phone}
              />
            </FieldComponent>
            <FieldComponent
              id="supplierEmail"
              label="Supplier Email"
              error={supplierErrors.email}
            >
              <Input
                type="email"
                value={supplierEmailInput}
                onChange={(e) => setSupplierEmailInput(e.target.value)}
                placeholder="e.g. orders@sysco.com"
                aria-invalid={!!supplierErrors.email}
              />
            </FieldComponent>
            <DialogFooter className="pt-4 border-t">
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancel
              </DialogClose>
              <Button type="submit">
                {editingSupplier ? "Update Supplier" : "Save Supplier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Supplier Confirmation */}
      <Dialog open={supplierDeleteOpen} onOpenChange={setSupplierDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove {deletingSupplier?.name}?</DialogTitle>
            <DialogDescription>
              This removes the supplier from your list. Make sure no active
              inventory items rely on it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button variant="destructive" onClick={confirmDeleteSupplier}>
              Remove supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Menu Item Dialog with Recipe Builder */}
      <Dialog open={menuFormOpen} onOpenChange={setMenuFormOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle>
              {editingMenu
                ? `Edit Menu Item: ${editingMenu.name}`
                : "Add Menu Item"}
            </DialogTitle>
            <DialogDescription>
              Configure dish details and map required stock ingredients for
              automatic inventory deduction upon ordering.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMenu} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <FieldComponent
                id="menuName"
                label="Dish Name"
                error={menuErrors.name}
              >
                <Input
                  value={menuName}
                  onChange={(e) => setMenuName(e.target.value)}
                  placeholder="e.g. Truffle Pasta"
                  aria-invalid={!!menuErrors.name}
                />
              </FieldComponent>
              <FieldComponent
                id="menuPrice"
                error={menuErrors.price}
                label="Price ($)"
              >
                <Input
                  type="number"
                  step="0.01"
                  value={menuPrice}
                  onChange={(e) => setMenuPrice(e.target.value)}
                  placeholder="14.99"
                  aria-invalid={!!menuErrors.price}
                />
              </FieldComponent>
            </div>

            <FieldComponent
              id="menuCategory"
              error={menuErrors.category}
              label="Category"
            >
              <Select
                value={menuCategory}
                onValueChange={(value) => setMenuCategory(value ?? "Starters")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldComponent>

            <FieldComponent
              id="menuDesc"
              error={menuErrors.desc}
              label="Description"
            >
              <Textarea
                value={menuDesc}
                onChange={(e) => setMenuDesc(e.target.value)}
                placeholder="Brief description"
              />
            </FieldComponent>

            <FieldComponent
              id="menuImage"
              error={menuErrors.image}
              label="Menu Image"
            >
              <Input
                type="file"
                accept={ACCEPTED_TYPES.join(",")}
                onChange={handleImageChange}
                aria-invalid={!!menuErrors.image}
              />

              {preview && (
                <div className="relative">
                  <img
                    src={preview}
                    alt="Menu item preview"
                    className="h-40 w-40 rounded object-cover"
                  />
                  <Button
                    type="button"
                    className="cursor-pointer"
                    variant="destructive"
                    onClick={handleRemoveImage}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </FieldComponent>

            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  Recipe Ingredients (Stock Deduction)
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setRecipeIngredients((prev) => [
                      ...prev,
                      {
                        inventoryItemId: allItems[0]?.id || "",
                        quantityRequired: 1,
                      },
                    ])
                  }
                >
                  <Plus className="size-3.5 mr-1" /> Add Ingredient
                </Button>
              </div>

              {recipeIngredients.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">
                  No ingredients linked. Orders for this item will not reduce
                  stock levels automatically.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {recipeIngredients.map((rec, index) => {
                    const selectedInvItem = itemById[rec.inventoryItemId];
                    const invError =
                      menuErrors[`ingredients,${index},inventoryItemId`];
                    const qtyError =
                      menuErrors[`ingredients,${index},quantityRequired`];

                    return (
                      <FieldComponent
                        id={`recipeIngredients-${index}`}
                        label=""
                        key={index}
                        error={invError ?? qtyError}
                      >
                        <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-md border">
                          <select
                            className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                            value={rec.inventoryItemId}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRecipeIngredients((prev) =>
                                prev.map((item, idx) =>
                                  idx === index
                                    ? { ...item, inventoryItemId: val }
                                    : item,
                                ),
                              );
                            }}
                            aria-invalid={!!invError}
                          >
                            {allItems.map((inv) => (
                              <option key={inv.id} value={inv.id}>
                                {inv.name} ({inv.unit})
                              </option>
                            ))}
                          </select>

                          <Input
                            type="number"
                            step="0.01"
                            className="w-24"
                            value={rec.quantityRequired}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setRecipeIngredients((prev) =>
                                prev.map((item, idx) =>
                                  idx === index
                                    ? { ...item, quantityRequired: val }
                                    : item,
                                ),
                              );
                            }}
                            placeholder="Qty"
                            aria-invalid={!!qtyError}
                          />

                          <span className="text-xs text-muted-foreground w-10">
                            {selectedInvItem?.unit ?? ""}
                          </span>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() =>
                              setRecipeIngredients((prev) =>
                                prev.filter((_, idx) => idx !== index),
                              )
                            }
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </FieldComponent>
                    );
                  })}
                </div>
              )}
            </div>

            <DialogFooter className="pt-4 border-t">
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancel
              </DialogClose>
              <Button type="submit">
                {editingMenu ? "Update Menu Item" : "Save Menu Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Menu Item Confirmation */}
      <Dialog open={menuDeleteOpen} onOpenChange={setMenuDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove {deletingMenu?.name}?</DialogTitle>
            <DialogDescription>
              This removes the dish from your menu catalog. You can&apos;t undo
              this.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button variant="destructive" onClick={confirmDeleteMenu}>
              Remove dish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item detail sheet */}
      <Sheet open={itemDetailOpen} onOpenChange={setItemDetailOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {itemDetail && (
            <>
              <SheetHeader className="border-b pb-4">
                <SheetTitle>{itemDetail.name}</SheetTitle>
                <SheetDescription>
                  {supplierName[itemDetail.supplierId] ?? "No supplier"}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 px-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-semibold tabular-nums">
                      {qty(itemDetail.onHand, itemDetail.unit)}
                    </span>
                    <StatusBadgeComponent
                      statusLabel={STATUS_LABEL}
                      statusBadge={statusBadge}
                      status={getStatus(itemDetail)}
                    />
                  </div>
                  <StockBarComponent statusBar={statusBar} item={itemDetail} />
                  <p className="text-xs text-muted-foreground">
                    of {qty(itemDetail.par, itemDetail.unit)} par
                  </p>
                </div>

                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Par level</dt>
                    <dd className="tabular-nums">
                      {qty(itemDetail.par, itemDetail.unit)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      Low-stock at
                    </dt>
                    <dd className="tabular-nums">
                      {qty(itemDetail.lowAt, itemDetail.unit)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Expires</dt>
                    <dd>
                      <ExpiryCellComponent iso={itemDetail.expires} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Unit</dt>
                    <dd>{itemDetail.unit}</dd>
                  </div>
                </dl>

                <div className="space-y-2 border-t pt-4">
                  <h4 className="text-sm font-medium">Used in menu items</h4>
                  {usedInMenu.length === 0 ? (
                    <p className="text-xs italic text-muted-foreground">
                      Not used in any recipe.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {usedInMenu.map((m) => {
                        const r = m.ingredients?.find(
                          (x) => x.inventoryItemId === itemDetail.id,
                        );
                        return (
                          <Badge
                            key={m.id}
                            variant="outline"
                            className="text-xs"
                          >
                            {m.name}: {r?.quantityRequired} {itemDetail.unit}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <SheetFooter className="flex-row border-t pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setItemDetailOpen(false);
                    openEdit(itemDetail);
                  }}
                >
                  <Pencil className="size-4" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    setItemDetailOpen(false);
                    openDelete(itemDetail);
                  }}
                >
                  <Trash2 className="size-4" />
                  Remove
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */
function ViewToggle({
  view,
  onChange,
}: {
  view: "list" | "card";
  onChange: (next: "list" | "card") => void;
}) {
  return (
    <div
      role="group"
      aria-label="View"
      className="flex items-center rounded-lg border bg-muted p-0.5"
    >
      {(
        [
          { key: "list", label: "List view", icon: List },
          { key: "card", label: "Card view", icon: LayoutGrid },
        ] as const
      ).map(({ key, label, icon: Icon }) => (
        <Button
          key={key}
          variant={view === key ? "default" : "ghost"}
          size="icon"
          className="size-7"
          aria-label={label}
          aria-pressed={view === key}
          onClick={() => onChange(key)}
        >
          <Icon className="size-4" />
        </Button>
      ))}
    </div>
  );
}

function PaginationFooter({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (next: number) => void;
}) {
  if (total === 0) return null;

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const firstBtn = Math.max(1, Math.min(currentPage - 2, pageCount - 4));
  const buttons = Array.from(
    { length: Math.min(5, pageCount) },
    (_, i) => firstBtn + i,
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <span className="tabular-nums">
        Showing {start + 1}–{end} of {total}
      </span>
      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            aria-label="Previous page"
          >
            ‹
          </Button>
          {buttons.map((p) => (
            <Button
              key={p}
              variant={p === currentPage ? "default" : "outline"}
              size="icon"
              className="size-8"
              onClick={() => onPageChange(p)}
              aria-label={`Page ${p}`}
              aria-current={p === currentPage ? "page" : undefined}
            >
              {p}
            </Button>
          ))}
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={currentPage === pageCount}
            onClick={() => onPageChange(currentPage + 1)}
            aria-label="Next page"
          >
            ›
          </Button>
        </div>
      )}
    </div>
  );
}
