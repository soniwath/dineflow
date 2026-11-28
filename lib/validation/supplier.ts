import { z } from "zod";

export const supplierBaseSchema = z.object({
  name: z.string().min(1, "Enter a name."),
  email: z.string().email("Enter a valid email address."),
  phone: z.string().min(1, "Enter a phone number."),
});

export function createSupplierSchema() {
  // Add any additional validation rules here if needed
  return supplierBaseSchema;
}
