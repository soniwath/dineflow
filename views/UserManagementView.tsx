"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { cn, formatDate, formatTime } from "@/lib/utils";
import {
  FilterOption,
  UserStatus,
  User,
  UpdateUserBody,
  CreateUserBody,
  UserErrors,
} from "@/types/User";
import {
  useUsersStore,
  STATUS_LABEL,
  statusBadge,
  roleBadge,
  AVATAR_COLORS,
  getInitials,
} from "@/stores/UserStore";
import { createUserSchema } from "@/lib/validation/user";

import UserManagementSkeleton from "@/components/user/UserManagementSkeleton";
import FilterPopoverComponent from "@/components/user/FilterPopoverComponent";
import UserActionsComponent from "@/components/user/UserActionsComponent";
import UserFormComponent from "@/components/user/UserFormComponent";

import StatusBadgeComponent from "@/components/StatusBadgeComponent";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, List, Plus, Search } from "lucide-react";

export default function UserManagementView() {
  const {
    users,
    userRoles,
    loading,
    loadData,
    addUser,
    updateUserRecord,
    removeUser,
  } = useUsersStore();

  const [tab, setTab] = useState("users");
  const [view, setView] = useState<"list" | "card">("list");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const [userErrors, setUserErrors] = useState<UserErrors>({});
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(() => {
    return {
      q: query.trim() || undefined,
      status: statusFilter.length > 0 ? statusFilter.join(",") : undefined,
      role: roleFilter.length > 0 ? roleFilter.join(",") : undefined,
    };
  }, [query, statusFilter, roleFilter]);

  const PAGE_SIZE = 10;

  const openAdd = () => {
    setEditing(null);
    setFormKey((value) => value + 1);
    setFormOpen(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    setFormKey((value) => value + 1);
    setFormOpen(true);
  };

  const openDelete = (user: User) => {
    setDeleting(user);
    setDeleteOpen(true);
  };

  const activeUsers = users.filter((user) => user.isActive).length;

  const statusOptions: FilterOption[] = [
    {
      value: "active",
      label: "Active",
      count: users.filter((user) => user.isActive).length,
      dot: "bg-emerald-500",
    },
    {
      value: "disabled",
      label: "Disabled",
      count: users.filter((user) => !user.isActive).length,
      dot: "bg-slate-500",
    },
  ];

  const DOT_COLORS: Record<string, string> = {
    owner: "bg-violet-500",
    manager: "bg-cyan-500",
  };
  const FALLBACK_DOTS = [
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-slate-500",
  ];
  const roleOptions: FilterOption[] = userRoles.map((role, i) => ({
    value: role.id, // the API filters by roleId, so use the id
    label: role.name,
    count: users.filter((user) => user.roleId === role.id).length,
    dot:
      DOT_COLORS[role.name.toLowerCase()] ??
      FALLBACK_DOTS[i % FALLBACK_DOTS.length],
  }));
  const getRole = (user: any) => {
    return userRoles.find((role) => role.id === user.roleId)?.name ?? "N/A";
  };

  const rows = useMemo(() => {
    return users
      .filter((user) => {
        if (statusFilter.length) {
          if (statusFilter.includes("active") && !user.isActive) return false;
          if (statusFilter.includes("disabled") && user.isActive) return false;
        }
        if (roleFilter.length && !roleFilter.includes(user.roleId))
          return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [roleFilter, statusFilter, users]);

  const filtersActive =
    query.trim() !== "" || statusFilter.length > 0 || roleFilter.length > 0;

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);

  const firstPageBtn = Math.max(1, Math.min(currentPage - 2, pageCount - 4));
  const pageButtons = Array.from(
    { length: Math.min(5, pageCount) },
    (_, index) => firstPageBtn + index,
  );

  const handleSubmit = async (input: {
    name: string;
    email: string;
    roleId: string;
    status: UserStatus;
    phone: string;
    password?: string;
  }) => {
    try {
      setSaving(true);
      setError(null);

      const result = createUserSchema().safeParse(input);

      if (!result.success) {
        const next: UserErrors = {};
        for (const issue of result.error.issues) {
          const key = issue.path[0] as keyof UserErrors;
          next[key] ??= issue.message; // keep the first error per field
        }

        setUserErrors(next);
        return;
      }

      setUserErrors({});

      if (editing) {
        const payload: UpdateUserBody = {
          name: result.data.name,
          email: result.data.email,
          phone: result.data.phone,
          roleId: result.data.roleId,
          isActive: result.data.isActive,
        };

        if (result.data.password) {
          payload.password = result.data.password;
        }

        await updateUserRecord(editing.id, payload);
      } else {
        const payload: CreateUserBody = {
          name: result.data.name,
          email: result.data.email,
          roleId: result.data.roleId,
          phone: result.data.phone,
          isActive: result.data.isActive,
          password: result.data.password ?? "",
        };

        await addUser(payload);
      }

      setFormOpen(false);
      await loadData(params, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      setSaving(true);
      setError(null);
      await removeUser(deleting.id);
      setDeleteOpen(false);
      setDeleting(null);
      await loadData(params, true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete user");
    } finally {
      setSaving(false);
    }
  };

  const clearFilters = () => {
    setQuery("");
    setStatusFilter([]);
    setRoleFilter([]);
    setPage(1);
  };

  const formatDateTime = (iso: string | null) => {
    if (!iso) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;

    return `${formatDate(date.toISOString().split("T")[0])} ${formatTime(
      date.toTimeString().split(" ")[0].slice(0, 5),
    )}`;
  };

  const onFirstLoad = useRef(true);

  // side effects
  useEffect(() => {
    if (onFirstLoad.current) {
      onFirstLoad.current = false;
      return;
    }

    if (
      params.q === undefined &&
      params.status === undefined &&
      params.role === undefined
    ) {
      return;
    }

    const timer = setTimeout(() => {
      loadData(params, true);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, statusFilter, roleFilter]);

  useEffect(() => {
    loadData(params);
  }, []);

  if (loading) {
    return <UserManagementSkeleton />;
  }

  return (
    <div className="space-y-4">
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(String(value))}
        className="space-y-4"
      >
        <div className="flex flex-col items-end justify-between gap-3 lg:flex-row lg:items-center">
          <TabsList className="w-full lg:w-3/4">
            <TabsTrigger
              value="users"
              className="w-full cursor-pointer gap-2 px-3"
            >
              Users
              <span className="text-xs tabular-nums text-muted-foreground">
                {users.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="roles"
              className="w-full cursor-pointer gap-2 px-3"
            >
              Roles
              <span className="text-xs tabular-nums text-muted-foreground">
                {userRoles.length}
              </span>
            </TabsTrigger>
          </TabsList>

          {tab === "users" && (
            <Button size="sm" onClick={openAdd} className="cursor-pointer">
              <Plus className="size-4" />
              Add user
            </Button>
          )}
        </div>

        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <TabsContent value="users" className="mt-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users, email or location"
                className="pl-9"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
              />
            </div>

            <FilterPopoverComponent
              title="Status"
              options={statusOptions}
              selected={statusFilter}
              onChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            />

            <FilterPopoverComponent
              title="Role"
              options={roleOptions}
              selected={roleFilter}
              onChange={(value) => {
                setRoleFilter(value);
                setPage(1);
              }}
            />

            {filtersActive && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            )}

            <div className="ml-auto flex items-center gap-2">
              {activeUsers > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-400"
                  onClick={() => {
                    setStatusFilter(["active"]);
                    setPage(1);
                  }}
                >
                  {activeUsers} active
                </Button>
              )}

              <div
                role="group"
                aria-label="View"
                className="flex items-center rounded-lg border bg-muted p-0.5"
              >
                {(
                  [
                    { key: "list", label: "List view", icon: List },
                    { key: "card", label: "Card view", icon: LayoutGrid },
                  ] as const
                ).map(({ key, label, icon: Icon }) => (
                  <Button
                    key={key}
                    variant={view === key ? "default" : "ghost"}
                    size="icon"
                    className="size-7"
                    aria-label={label}
                    aria-pressed={view === key}
                    onClick={() => setView(key)}
                  >
                    <Icon className="size-4" />
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {filtersActive
                    ? "No users match your filters"
                    : "No users yet"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {filtersActive
                    ? "Try a different search or clear the filters."
                    : "Add your first team member to get started."}
                </p>
              </div>
              {filtersActive ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button size="sm" onClick={openAdd}>
                  <Plus className="size-4" />
                  Add user
                </Button>
              )}
            </div>
          ) : view === "list" ? (
            <div className="overflow-hidden rounded-xl border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last active</TableHead>
                    <TableHead className="w-24">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex size-9 items-center justify-center rounded-full text-xs font-medium text-white",
                              AVATAR_COLORS[
                                Math.abs(
                                  user.name
                                    .split("")
                                    .reduce(
                                      (sum, char) => sum + char.charCodeAt(0),
                                      0,
                                    ),
                                ) % AVATAR_COLORS.length
                              ],
                            )}
                          >
                            {getInitials(user.name)}
                          </div>
                          <div className="space-y-0.5">
                            <div className="font-medium">{user.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "rounded-full font-normal",
                            roleBadge[getRole(user).toLowerCase()],
                          )}
                        >
                          {getRole(user)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadgeComponent
                          statusLabel={STATUS_LABEL}
                          status={user.isActive ? "active" : "disabled"}
                          statusBadge={statusBadge}
                        />
                      </TableCell>
                      <TableCell>
                        {formatDateTime(user.lastLoginAt) ?? "N/A"}
                      </TableCell>
                      <TableCell>
                        <UserActionsComponent
                          user={user}
                          onEdit={openEdit}
                          onDelete={openDelete}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pageRows.map((user) => (
                <article
                  key={user.id}
                  className="flex flex-col gap-4 rounded-xl border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex size-10 items-center justify-center rounded-full text-sm font-medium text-white",
                          AVATAR_COLORS[
                            Math.abs(
                              user.name
                                .split("")
                                .reduce(
                                  (sum, char) => sum + char.charCodeAt(0),
                                  0,
                                ),
                            ) % AVATAR_COLORS.length
                          ],
                        )}
                      >
                        {getInitials(user.name)}
                      </div>
                    </div>

                    <StatusBadgeComponent
                      status={user.isActive ? "active" : "disabled"}
                      statusLabel={STATUS_LABEL}
                      statusBadge={statusBadge}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <Badge
                        className={cn(
                          "rounded-full font-normal",
                          roleBadge[getRole(user).toLowerCase()],
                        )}
                      >
                        {getRole(user)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {user.lastLoginAt ?? "N/A"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-auto border-t pt-3">
                    <UserActionsComponent
                      user={user}
                      onEdit={openEdit}
                      onDelete={openDelete}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}

          {rows.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
              <span className="tabular-nums">
                Showing {start + 1}–{start + pageRows.length} of {rows.length}
              </span>
              {pageCount > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    disabled={currentPage === 1}
                    onClick={() => setPage(currentPage - 1)}
                    aria-label="Previous page"
                  >
                    ‹
                  </Button>
                  {pageButtons.map((pageNumber) => (
                    <Button
                      key={pageNumber}
                      variant={
                        pageNumber === currentPage ? "default" : "outline"
                      }
                      size="icon"
                      className="size-8"
                      onClick={() => setPage(pageNumber)}
                      aria-label={`Page ${pageNumber}`}
                      aria-current={
                        pageNumber === currentPage ? "page" : undefined
                      }
                    >
                      {pageNumber}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    disabled={currentPage === pageCount}
                    onClick={() => setPage(currentPage + 1)}
                    aria-label="Next page"
                  >
                    ›
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="roles" className="mt-0">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {userRoles.map((role) => {
              const members = users.filter((user) => user.roleId === role.id);
              const active = members.filter((user) => user.isActive).length;

              return (
                <article
                  key={role.id}
                  className="flex flex-col gap-3 rounded-xl border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "size-2.5 rounded-full",
                          DOT_COLORS[role.name.toLowerCase()] ??
                            FALLBACK_DOTS[
                              Math.abs(
                                role.name
                                  .split("")
                                  .reduce(
                                    (sum, char) => sum + char.charCodeAt(0),
                                    0,
                                  ),
                              ) % FALLBACK_DOTS.length
                            ],
                        )}
                      />
                      <h3 className="text-sm font-medium">{role.name}</h3>
                    </div>
                    <Badge
                      className={cn(
                        "rounded-full font-normal",
                        roleBadge[role.name.toLowerCase()],
                      )}
                    >
                      {active} active
                    </Badge>
                  </div>

                  {role.description && (
                    <p className="text-sm text-muted-foreground">
                      {role.description}
                    </p>
                  )}

                  <p className="text-sm text-muted-foreground">
                    {members.length}{" "}
                    {members.length === 1 ? "member" : "members"}
                  </p>

                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-auto self-start"
                    onClick={() => {
                      setRoleFilter([role.id]);
                      setStatusFilter([]);
                      setQuery("");
                      setPage(1);
                      setTab("users");
                    }}
                  >
                    View users
                  </Button>
                </article>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create or edit user dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader className="border-b pb-4">
            <DialogTitle>
              {editing ? `Edit ${editing.name}` : "Add team member"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Changes are applied immediately and update the team list right away."
                : "New members appear in the user list and can start using the workspace immediately."}
            </DialogDescription>
          </DialogHeader>

          <UserFormComponent
            key={formKey}
            user={editing}
            userRoles={userRoles}
            onSubmit={handleSubmit}
            saving={saving}
            errors={userErrors}
          />
        </DialogContent>
      </Dialog>

      {/* Delete user dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove {deleting?.name}?</DialogTitle>
            <DialogDescription>
              This removes them from the team. You can&apos;t undo this.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving ? "Removing..." : "Remove user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
