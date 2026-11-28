import { NextResponse } from "next/server";
import {
  requireSchedulingManager,
  SchedulingAccessError,
} from "@/lib/auth/scheduling";
import { createStaffShift, SchedulingError } from "@/lib/db/scheduling";
import { revalidateTag } from "next/cache";
import { SCHEDULING_CACHE_TAG } from "@/app/api/scheduling/route";

export async function POST(request: Request) {
  try {
    await requireSchedulingManager();
    const body: unknown = await request.json().catch(() => null);
    const shift = await createStaffShift(body);

    // Revalidate the scheduling cache so that the new shift is reflected in subsequent requests
    revalidateTag(SCHEDULING_CACHE_TAG, { expire: 0 });

    return NextResponse.json({ shift }, { status: 201 });
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
    console.error("Failed to create shift", error);
    return NextResponse.json(
      { message: "Failed to create shift" },
      { status: 500 },
    );
  }
}
