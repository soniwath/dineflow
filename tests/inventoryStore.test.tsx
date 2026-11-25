import React from "react";
import { renderHook, act } from "@testing-library/react";
import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import {
  InventoryProvider,
  useInventory,
  getStatus,
} from "@/stores/InventoryStore"; // Update path to your provider file
import {
  getInventoryItemsApi,
  saveInventoryItemApi,
  deleteInventoryItemApi,
} from "@/lib/api/inventory";
import {
  getMenuItemsApi,
  saveMenuItemApi,
  updateMenuItemApi,
  deleteMenuItemApi,
} from "@/lib/api/menu";
import {
  getSuppliersApi,
  saveSupplierApi,
  deleteSupplierApi,
} from "@/lib/api/suppliers";
import { InventoryItem, ItemInput } from "@/types/Inventory";
import { Supplier } from "@/types/Supplier";
import { MenuItem } from "@/types/Menu";

// Mock API modules
jest.mock("@/lib/api/inventory", () => ({
  getInventoryItemsApi: jest.fn(),
  saveInventoryItemApi: jest.fn(),
  deleteInventoryItemApi: jest.fn(),
}));

jest.mock("@/lib/api/menu", () => ({
  getMenuItemsApi: jest.fn(),
  saveMenuItemApi: jest.fn(),
  updateMenuItemApi: jest.fn(),
  deleteMenuItemApi: jest.fn(),
}));

jest.mock("@/lib/api/suppliers", () => ({
  getSuppliersApi: jest.fn(),
  saveSupplierApi: jest.fn(),
  deleteSupplierApi: jest.fn(),
}));

const mockedGetInventory = getInventoryItemsApi as jest.MockedFunction<
  typeof getInventoryItemsApi
>;
const mockedSaveInventory = saveInventoryItemApi as jest.MockedFunction<
  typeof saveInventoryItemApi
>;
const mockedDeleteInventory = deleteInventoryItemApi as jest.MockedFunction<
  typeof deleteInventoryItemApi
>;

const mockedGetMenu = getMenuItemsApi as jest.MockedFunction<
  typeof getMenuItemsApi
>;
const mockedSaveMenu = saveMenuItemApi as jest.MockedFunction<
  typeof saveMenuItemApi
>;
const mockedUpdateMenu = updateMenuItemApi as jest.MockedFunction<
  typeof updateMenuItemApi
>;
const mockedDeleteMenu = deleteMenuItemApi as jest.MockedFunction<
  typeof deleteMenuItemApi
>;

const mockedGetSuppliers = getSuppliersApi as jest.MockedFunction<
  typeof getSuppliersApi
>;
const mockedSaveSupplier = saveSupplierApi as jest.MockedFunction<
  typeof saveSupplierApi
>;
const mockedDeleteSupplier = deleteSupplierApi as jest.MockedFunction<
  typeof deleteSupplierApi
>;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <InventoryProvider>{children}</InventoryProvider>
);

describe("getStatus helper", () => {
  test("returns correct stock status based on onHand and lowAt", () => {
    expect(getStatus({ onHand: 0, lowAt: 5 } as InventoryItem)).toBe("out");
    expect(getStatus({ onHand: -2, lowAt: 5 } as InventoryItem)).toBe("out");
    expect(getStatus({ onHand: 5, lowAt: 5 } as InventoryItem)).toBe("low");
    expect(getStatus({ onHand: 3, lowAt: 5 } as InventoryItem)).toBe("low");
    expect(getStatus({ onHand: 6, lowAt: 5 } as InventoryItem)).toBe("at-par");
  });
});

describe("InventoryContext & Provider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("throws error when useInventory is used outside InventoryProvider", () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    expect(() => renderHook(() => useInventory())).toThrow(
      "useInventory must be used inside <InventoryProvider>",
    );
    consoleSpy.mockRestore();
  });

  test("loads all inventory, menu, and supplier data successfully", async () => {
    const mockItems = [{ id: "i1", name: "Flour", onHand: 10, lowAt: 2 }] as InventoryItem[];
    const mockMenu = [{ id: "m1", name: "Burger" }] as MenuItem[];
    const mockSuppliers = [{ id: "s1", name: "Sysco" }] as Supplier[];

    mockedGetInventory.mockResolvedValueOnce(mockItems);
    mockedGetMenu.mockResolvedValueOnce(mockMenu);
    mockedGetSuppliers.mockResolvedValueOnce(mockSuppliers);

    const { result } = renderHook(() => useInventory(), { wrapper });

    await act(async () => {
      await result.current.loadData();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.items).toEqual(mockItems);
    expect(result.current.menuItems).toEqual(mockMenu);
    expect(result.current.suppliers).toEqual(mockSuppliers);
  });

  describe("Inventory Item CRUD", () => {
    test("adds, updates, and removes an inventory item", async () => {
      const input = { name: "Tomatoes", onHand: 20, lowAt: 5 } as ItemInput;
      const savedItem = { id: "i1", ...input } as InventoryItem;
      const updatedItem = { ...savedItem, onHand: 15 } as InventoryItem;

      mockedSaveInventory
        .mockResolvedValueOnce(savedItem)
        .mockResolvedValueOnce(updatedItem);
      mockedDeleteInventory.mockResolvedValueOnce(undefined as any);

      const { result } = renderHook(() => useInventory(), { wrapper });

      // Add
      await act(async () => {
        await result.current.addItem(input);
      });
      expect(mockedSaveInventory).toHaveBeenCalledWith(input);
      expect(result.current.items).toEqual([savedItem]);

      // Update
      await act(async () => {
        await result.current.updateItem("i1", { ...input, onHand: 15 });
      });
      expect(mockedSaveInventory).toHaveBeenCalledWith({
        ...input,
        onHand: 15,
        id: "i1",
      });
      expect(result.current.items).toEqual([updatedItem]);

      // Remove
      await act(async () => {
        await result.current.removeItem("i1");
      });
      expect(mockedDeleteInventory).toHaveBeenCalledWith("i1");
      expect(result.current.items).toEqual([]);
    });
  });

  describe("Supplier CRUD", () => {
    test("adds, updates, and removes a supplier", async () => {
      const input = { name: "Fresh Farms" } as Omit<Supplier, "id">;
      const savedSupplier = { id: "s1", ...input } as Supplier;
      const updatedSupplier = { id: "s1", name: "Organic Farms" } as Supplier;

      mockedSaveSupplier
        .mockResolvedValueOnce(savedSupplier)
        .mockResolvedValueOnce(updatedSupplier);
      mockedDeleteSupplier.mockResolvedValueOnce(undefined as any);

      const { result } = renderHook(() => useInventory(), { wrapper });

      // Add
      await act(async () => {
        await result.current.addSupplier(input);
      });
      expect(result.current.suppliers).toEqual([savedSupplier]);

      // Update
      await act(async () => {
        await result.current.updateSupplier("s1", { name: "Organic Farms" });
      });
      expect(mockedSaveSupplier).toHaveBeenCalledWith({
        name: "Organic Farms",
        id: "s1",
      });
      expect(result.current.suppliers).toEqual([updatedSupplier]);

      // Remove
      await act(async () => {
        await result.current.removeSupplier("s1");
      });
      expect(mockedDeleteSupplier).toHaveBeenCalledWith("s1");
      expect(result.current.suppliers).toEqual([]);
    });
  });

  describe("Menu Item CRUD", () => {
    test("adds, updates, and removes a menu item", async () => {
      const menuItem = { id: "m1", name: "Pasta" } as MenuItem;
      const updatedMenu = { id: "m1", name: "Truffle Pasta" } as MenuItem;

      mockedSaveMenu.mockResolvedValueOnce(menuItem);
      mockedUpdateMenu.mockResolvedValueOnce(updatedMenu);
      mockedDeleteMenu.mockResolvedValueOnce(undefined as any);

      const { result } = renderHook(() => useInventory(), { wrapper });

      // Add
      await act(async () => {
        await result.current.addMenuItem(menuItem);
      });
      expect(result.current.menuItems).toEqual([menuItem]);

      // Update
      await act(async () => {
        await result.current.updateMenuItem("m1", updatedMenu);
      });
      expect(mockedUpdateMenu).toHaveBeenCalledWith(updatedMenu);
      expect(result.current.menuItems).toEqual([updatedMenu]);

      // Remove
      await act(async () => {
        await result.current.removeMenuItem("m1");
      });
      expect(mockedDeleteMenu).toHaveBeenCalledWith("m1");
      expect(result.current.menuItems).toEqual([]);
    });
  });
});
