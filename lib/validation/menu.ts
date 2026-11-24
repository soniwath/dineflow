import { z } from "zod";

export const menuBaseSchema = z.object({
  name: z.string().min(1, "Enter a name."),
  price: z
    .number({ error: "Price is required." })
    .gt(0, "Enter a price above 0.")
    .refine((v) => Number.isInteger(Math.round(v * 100 * 1e6) / 1e6), {
      error: "Price can have at most 2 decimal places.",
    }),
  category: z.enum(["Starters", "Mains", "Desserts", "Beverages"], {
    error: (issue) =>
      issue.input === undefined ? "Category is required" : "Invalid category",
  }),
  image: z
    .union([z.string(), z.instanceof(File), z.null()])
    .optional()
    .refine(
      (v) =>
        v === undefined ||
        v === null ||
        (typeof v === "string" && v.length > 0) ||
        (v instanceof File && v.size > 0),
      "Choose an image.",
    ),
  desc: z.string().optional(),
  ingredients: z
    .array(
      z.object({
        id: z.string().optional(),
        menuItemId: z.string().optional(),
        inventoryItemId: z.string(),
        quantityRequired: z
          .number({ error: "Enter a quantity." })
          .gt(0, "Enter a quantity above 0."),
      }),
    )
    .optional(),
});

export function createMenuSchema() {
  // Add any additional validation rules here if needed
  return menuBaseSchema;
}
