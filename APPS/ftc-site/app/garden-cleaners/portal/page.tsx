export const dynamic = "force-static";
import { redirect } from "next/navigation";
import { getGardenCleanersPortalUrl } from "@/lib/gardenCleaners";

export default function GardenClientPortalLegacyRedirectPage() {
  redirect(getGardenCleanersPortalUrl());
}
