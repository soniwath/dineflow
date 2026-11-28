import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { isAuthenticated } from "@/lib/auth/jwt";
import { listBills } from "@/lib/db/billing";

export const BILLING_CACHE_TAG = "billing";

const getCachedBills = unstable_cache(
  async () => listBills(),
  ["billing-list"],
  { tags: [BILLING_CACHE_TAG], revalidate: 60 },
);

export async function GET() {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { bills: await getCachedBills() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Failed to load bills", error);
    return NextResponse.json(
      { message: "Failed to load bills" },
      { status: 500 },
    );
  }
}
