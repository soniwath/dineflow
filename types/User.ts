export type UserStatus = "active" | "disabled";

export type UserRole = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type FilterOption = {
  value: string;
  label: string;
  count: number;
  dot?: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  roleId: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  password: string;
};

export type UpdateUserBody = Partial<{
  name: string;
  email: string;
  password: string;
  phone: string;
  roleId?: string;
  isActive: boolean;
  lastLoginAt: string | null;
}>;

export type CreateUserBody = {
  name: string;
  email: string;
  phone: string;
  password: string;
  roleId?: string;
  isActive?: boolean;
};

export type UserErrors = Partial<Record<keyof User, string>>;
