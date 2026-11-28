import { z } from "zod";
import type { InventoryItem } from "@/types/Inventory";

const MIN_ZERO_MSG = "Enter 0 or more.";
const PAR_MSG = "Enter a par level above 0.";

const qty = z.coerce.number({ error: MIN_ZERO_MSG }).min(0, MIN_ZERO_MSG);

// Field rules only. Reuse these in your API route too.
export const itemFields = {
  name: z.string().trim().min(1, "Enter an ingredient name."),
  unit: z.string().min(1),
  onHand: qty,
  par: z.coerce.number({ error: PAR_MSG }).gt(0, PAR_MSG),
  lowAt: qty,
  expires: z
    .string()
    .refine(
      (v) => v === "" || !Number.isNaN(Date.parse(v)),
      "Enter a valid date.",
    )
    .transform((v) => v || null),
  supplierId: z.string().min(1, "Choose a supplier."),
};

type CrossFields = { par: number; lowAt: number };

function checkLowAtVsPar(data: CrossFields, ctx: z.RefinementCtx) {
  if (data.lowAt > data.par) {
    ctx.addIssue({
      code: "custom",
      path: ["lowAt"],
      message: "Can't be higher than par.",
    });
  }
}

export const itemBaseSchema = z.object(itemFields).superRefine(checkLowAtVsPar);

// Client-side rules that depend on current store data
export function createItemSchema({
  items,
  suppliers,
  currentId,
}: {
  items: InventoryItem[];
  suppliers: { id: string }[];
  currentId?: InventoryItem["id"];
}) {
  return z
    .object({
      ...itemFields,
      name: itemFields.name.refine(
        (name) =>
          !items.some(
            (i) =>
              i.id !== currentId && i.name.toLowerCase() === name.toLowerCase(),
          ),
        "An item with this name already exists.",
      ),
      supplierId: itemFields.supplierId.refine(
        (id) => suppliers.some((s) => s.id === id),
        "Choose a valid supplier.",
      ),
    })
    .superRefine(checkLowAtVsPar);
}
