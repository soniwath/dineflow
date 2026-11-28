/** @jest-environment node */
import { beforeEach, expect, jest, test } from "@jest/globals";
import { cookies } from "next/headers";
import { GET } from "@/app/api/analytics/route";
import { verifyToken } from "@/lib/auth/jwt";
import { db } from "@/lib/db/index";
import * as analytics from "@/lib/db/analytics";
import { createPaidAnalyticsReport } from "@/lib/analytics";

jest.mock("server-only", () => ({}));
jest.mock("next/headers", () => ({ cookies: jest.fn() }));
jest.mock("@/lib/auth/jwt", () => ({ verifyToken: jest.fn() }));
jest.mock("@/lib/db/index", () => ({ db: { select: jest.fn() } }));

const load = jest.spyOn(analytics, "getSavedAnalytics");
const actorId = "10000000-0000-4000-8000-000000000001";
const roleId = "20000000-0000-4000-8000-000000000001";
const limitMock = jest.fn<() => Promise<unknown[]>>();
const dates = { startDate: "2026-10-22", endDate: "2026-10-22" };
const before = { startDate: "2026-10-21", endDate: "2026-10-21" };

function mockUserAndRole(
  user: { id: string; roleId: string; isActive: boolean } | null,
  role: { id: string; name: string } | null = null,
) {
  limitMock.mockReset();
  limitMock.mockResolvedValueOnce(user ? [user] : []);
  if (user) {
    limitMock.mockResolvedValueOnce(role ? [role] : []);
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(cookies)
    .mockResolvedValue({ get: () => ({ value: "token" }) } as never);
  jest.mocked(verifyToken).mockResolvedValue({ id: actorId, role: "Owner" });
  jest.mocked(db.select).mockReturnValue({
    from: () => ({ where: () => ({ limit: limitMock }) }),
  } as never);

  mockUserAndRole(
    { id: actorId, roleId, isActive: true },
    { id: roleId, name: "Manager" },
  );
  load.mockResolvedValue(
    createPaidAnalyticsReport([], "Custom", dates, before),
  );
});

function request(
  query = "range=Custom&startDate=2026-10-22&endDate=2026-10-22",
) {
  return new Request(`http://localhost/api/analytics?${query}`);
}

test.each(["Manager", "Owner"] as const)(
  "an active %s can load payment analytics",
  async (roleName) => {
    mockUserAndRole(
      { id: actorId, roleId, isActive: true },
      { id: roleId, name: roleName },
    );
    const result = await GET(request());
    expect(result.status).toBe(200);
    expect(result.headers.get("Cache-Control")).toBe("no-store");
    expect(load).toHaveBeenCalledWith("Custom", dates, before);
    expect((await result.json()).source).toBe("payments");
  },
);

test("checks the current database role instead of an old owner token", async () => {
  mockUserAndRole(
    { id: actorId, roleId, isActive: true },
    { id: roleId, name: "Staff" },
  );
  expect((await GET(request())).status).toBe(403);
  expect(load).not.toHaveBeenCalled();
});

test("rejects users whose role record is missing", async () => {
  mockUserAndRole({ id: actorId, roleId, isActive: true }, null);
  const result = await GET(request());
  expect(result.status).toBe(403);
  expect(await result.json()).toEqual({
    message: "User role not found. Please contact support.",
  });
  expect(load).not.toHaveBeenCalled();
});

test.each([{ user: null }, { user: { id: actorId, roleId, isActive: false } }])(
  "rejects missing or inactive accounts",
  async ({ user }) => {
    mockUserAndRole(user, { id: roleId, name: "Owner" });
    expect((await GET(request())).status).toBe(401);
    expect(load).not.toHaveBeenCalled();
  },
);

test("requires a valid sign-in before querying analytics", async () => {
  jest.mocked(verifyToken).mockResolvedValue(null);
  expect((await GET(request())).status).toBe(401);
  expect(db.select).not.toHaveBeenCalled();
  expect(load).not.toHaveBeenCalled();
});

test.each([
  "range=bad",
  "range=Custom",
  "range=Custom&startDate=2026-10-22&endDate=2026-10-21",
])("rejects invalid report requests: %s", async (query) => {
  expect((await GET(request(query))).status).toBe(400);
  expect(load).not.toHaveBeenCalled();
});

test("returns a load error instead of substituting demo sales", async () => {
  load.mockRejectedValueOnce(new Error("Database offline"));
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  try {
    const result = await GET(request());
    expect(result.status).toBe(500);
    expect(await result.json()).toEqual({
      message: "Could not load Analytics.",
    });
  } finally {
    log.mockRestore();
  }
});
