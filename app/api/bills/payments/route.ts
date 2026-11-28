import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { isAuthenticated } from "@/lib/auth/jwt";
import {
  BillingError,
  parsePaymentInput,
  recordBillPayment,
} from "@/lib/db/billing";
import { BILLING_CACHE_TAG } from "@/app/api/bills/route";
import { ANALYTICS_CACHE_TAG } from "@/app/api/analytics/route";

export async function POST(request: Request) {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const input = parsePaymentInput(await request.json().catch(() => null));
    const bill = await recordBillPayment(input);

    revalidateTag(BILLING_CACHE_TAG, { expire: 0 });
    revalidateTag(ANALYTICS_CACHE_TAG, { expire: 0 });

    return NextResponse.json({ bill });
  } catch (error) {
    if (error instanceof BillingError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status },
      );
    }
    console.error("Failed to record payment", error);
    return NextResponse.json(
      { message: "Failed to record payment" },
      { status: 500 },
    );
  }
}
