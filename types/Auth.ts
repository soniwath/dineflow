export type Role = "guest" | "staff" | "manager" | "owner";

export type AuthUser = {
  id: string;
  name: string;
  role: string;
};

export type Credentials = {
  email: string;
  password: string;
};

export type LoginResult =
  | { ok: true; user: AuthUser }
  | { ok: false; error: string };

export type FieldErrors = { email?: string; password?: string };
