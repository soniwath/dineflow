import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DialogClose } from "@/components/ui/dialog";
import { UserRole, UserStatus, User } from "@/types/User";
import FieldComponent from "@/components/FieldComponent";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function UserFormComponent({
  user,
  userRoles,
  onSubmit,
  saving,
  errors,
}: {
  user: User | null;
  userRoles: UserRole[];
  onSubmit: (input: {
    name: string;
    email: string;
    roleId: string;
    status: UserStatus;
    phone: string;
    password?: string;
  }) => void;
  saving: boolean;
  errors: Partial<Record<keyof User, string>>;
}) {
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [roleId, setRoleId] = useState(user?.roleId ?? null);
  const [status, setStatus] = useState<UserStatus>(
    user?.isActive ? "active" : "disabled",
  );
  const [password, setPassword] = useState("");

  return (
    <div className="space-y-4 py-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldComponent id="name" label="Full name" error={errors.name}>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={!!errors.name}
            placeholder="John Doe"
          />
        </FieldComponent>

        <FieldComponent id="email" label="Email" error={errors.email}>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={!!errors.email}
            placeholder="name@example.com"
          />
        </FieldComponent>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldComponent id="role" label="Role" error={errors.roleId}>
          <Select value={roleId} onValueChange={setRoleId}>
            <SelectTrigger
              id="role"
              className="w-full"
              aria-invalid={!!errors.roleId}
            >
              <SelectValue placeholder="Select a role">
                {userRoles.find((r) => r.id === roleId)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {userRoles.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldComponent>

        <FieldComponent id="status" label="Status" error={errors.isActive}>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as UserStatus)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-invalid={!!errors.isActive}
          >
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </FieldComponent>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldComponent id="phone" label="Phone" error={errors.phone}>
          <Input
            id="phone"
            type="text"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            aria-invalid={!!errors.phone}
            placeholder="+855 123 456 789"
          />
        </FieldComponent>

        <FieldComponent
          id="password"
          label={`Password ${user ? "(optional)" : ""}`}
          error={errors.password}
        >
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={!!errors.password}
            placeholder="Enter a new password"
          />
        </FieldComponent>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        <Button
          disabled={saving}
          onClick={() =>
            onSubmit({
              name: name.trim(),
              email: email.trim(),
              roleId: roleId ?? "",
              status,
              phone: phone.trim(),
              password: password.trim() || undefined,
            })
          }
        >
          {saving ? "Saving..." : user ? "Save changes" : "Add user"}
        </Button>
      </div>
    </div>
  );
}
