import { z } from "zod";
import type { FloorTable, Zone } from "@/types/Floor";

const NUMBER_MSG = "Enter a whole number, 1 or higher.";
const SEATS_MSG = "Enter between 1 and 12 seats.";

// Shape/format rules only. Reuse this one in your API route too.
export const tableBaseSchema = z.object({
  number: z.coerce
    .number({ error: NUMBER_MSG })
    .int(NUMBER_MSG)
    .min(1, NUMBER_MSG),
  seats: z.coerce
    .number({ error: SEATS_MSG })
    .int(SEATS_MSG)
    .min(1, SEATS_MSG)
    .max(12, SEATS_MSG),
  shape: z.enum(["round", "square", "rect"]),
  zone: z.string().min(1, "Choose an area."),
});

// Client-side rules that depend on current store data
export function createTableSchema({
  tables,
  zones,
  currentId,
}: {
  tables: FloorTable[];
  zones: Zone[];
  currentId?: FloorTable["id"];
}) {
  return tableBaseSchema.superRefine((data, ctx) => {
    if (tables.some((t) => t.id !== currentId && t.number === data.number)) {
      ctx.addIssue({
        code: "custom",
        path: ["number"],
        message: `Table ${data.number} already exists.`,
      });
    }
    if (!zones.includes(data.zone as Zone)) {
      ctx.addIssue({
        code: "custom",
        path: ["zone"],
        message: "Choose a valid area.",
      });
    }
  });
}
