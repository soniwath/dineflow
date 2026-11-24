import { z } from "zod";

export const userBaseSchema = z.object({
  name: z.string().min(1, "Enter a name."),
  email: z.string().email("Enter a valid email address."),
  phone: z.string().min(1, "Enter a phone number."),
  role: z.enum(["owner", "manager", "staff"], {
    error: (issue) =>
      issue.input === undefined ? "Role is required" : "Invalid role",
  }),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters long.")
    .optional(),
  isActive: z.boolean().optional(),
  lastLoginAt: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export function createUserSchema() {
  // Add any additional validation rules here if needed
  return userBaseSchema;
}
