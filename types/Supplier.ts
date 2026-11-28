export type Supplier = {
  id: string;
  name: string;
  phone: string;
  email: string;
};

export type SupplierErrors = Partial<Record<keyof Supplier, string>>;
