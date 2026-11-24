export type UserStatus = "active" | "disabled";

export type UserRole = "owner" | "manager" | "staff";

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
  role: UserRole;
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
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
}>;

export type CreateUserBody = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role?: UserRole;
  isActive?: boolean;
};

export type UserErrors = Partial<Record<keyof User, string>>;
