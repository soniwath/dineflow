import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import {
  requireSchedulingUser,
  SchedulingAccessError,
} from "@/lib/auth/scheduling";
import { getStaffSchedule, SchedulingError } from "@/lib/db/scheduling";

export const SCHEDULING_CACHE_TAG = "scheduling";

const getCachedStaffSchedule = unstable_cache(
  async (weekStart: string | null, userId: string, roleId: string) =>
    getStaffSchedule(weekStart, { id: userId, roleId }),
  ["staff-schedule"],
  { tags: [SCHEDULING_CACHE_TAG], revalidate: 60 },
);

export async function GET(request: Request) {
  try {
    const user = await requireSchedulingUser();
    const weekStart = new URL(request.url).searchParams.get("weekStart");
    const data = await getCachedStaffSchedule(
      weekStart,
      user.id,
      String(user.roleId),
    );
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (
      error instanceof SchedulingAccessError ||
      error instanceof SchedulingError
    ) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }
    console.error("Failed to load scheduling", error);
    return NextResponse.json(
      { message: "Failed to load scheduling" },
      { status: 500 },
    );
  }
}
