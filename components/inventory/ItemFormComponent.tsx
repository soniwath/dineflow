import { useState } from "react";
import { useInventory, UNITS } from "@/stores/InventoryStore";
import {
  InventoryItem,
  ItemInput,
  FormState,
  FormErrors,
} from "@/types/Inventory";
import { createItemSchema } from "@/lib/validation/item";

import FieldComponent from "@/components/FieldComponent";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ItemFormComponent({
  item,
  onSubmit,
}: {
  item: InventoryItem | null;
  onSubmit: (input: ItemInput) => void;
}) {
  const { items, suppliers } = useInventory();

  const quantityFields = [
    { key: "onHand", label: "On hand" },
    { key: "par", label: "Par level" },
    { key: "lowAt", label: "Low-stock alert at" },
  ] as const;

  const supplierOptions = suppliers.map((s) => ({
    value: s.id,
    label: s.name,
  }));

  const [form, setForm] = useState<FormState>(() => ({
    name: item?.name ?? "",
    unit: item?.unit ?? "pc",
    onHand: item ? String(item.onHand) : "",
    par: item ? String(item.par) : "",
    lowAt: item ? String(item.lowAt) : "",
    expires: item?.expires ?? "",
    supplierId: item?.supplierId ?? "",
  }));
  const [errors, setErrors] = useState<FormErrors>({});

  const set = (key: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = createItemSchema({
      items,
      suppliers,
      currentId: item?.id,
    }).safeParse(form);

    if (!result.success) {
      const next: FormErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof FormErrors;
        next[key] ??= issue.message; // keep the first error per field
      }
      setErrors(next);
      return;
    }

    setErrors({});
    onSubmit(result.data);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <FieldComponent id="name" label="Ingredient name" error={errors.name}>
        <Input
          id="name"
          placeholder="e.g. Meyer lemons"
          value={form.name}
          aria-invalid={!!errors.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </FieldComponent>

      <div className="grid grid-cols-2 gap-4">
        <FieldComponent id="unit" label="Unit">
          <Select
            value={form.unit}
            onValueChange={(v) => set("unit", v ?? "pc")}
          >
            <SelectTrigger id="unit" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNITS.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldComponent>

        {quantityFields.map((f) => (
          <FieldComponent
            key={f.key}
            id={f.key}
            label={f.label}
            error={errors[f.key]}
          >
            <div className="relative">
              <Input
                id={f.key}
                type="number"
                min="0"
                step="any"
                placeholder="0"
                className="pr-12"
                value={form[f.key]}
                aria-invalid={!!errors[f.key]}
                onChange={(e) => set(f.key, e.target.value)}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                {form.unit}
              </span>
            </div>
          </FieldComponent>
        ))}

        <FieldComponent
          id="expires"
          label="Expiry date"
          hint="Leave blank if it doesn't expire."
        >
          <Input
            id="expires"
            type="date"
            value={form.expires}
            onChange={(e) => set("expires", e.target.value)}
          />
        </FieldComponent>

        <FieldComponent
          id="supplier"
          label="Supplier"
          error={errors.supplierId}
        >
          <Select
            items={supplierOptions}
            value={form.supplierId || null}
            onValueChange={(v) => set("supplierId", v ?? "")}
          >
            <SelectTrigger
              id="supplier"
              className="w-full"
              aria-invalid={!!errors.supplierId}
            >
              <SelectValue placeholder="Choose a supplier" />
            </SelectTrigger>
            <SelectContent>
              {supplierOptions.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldComponent>
      </div>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        <Button type="submit">{item ? "Save changes" : "Add item"}</Button>
      </DialogFooter>
    </form>
  );
}
