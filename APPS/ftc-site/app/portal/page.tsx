import { redirect } from "next/navigation";
import { getGardenCleanersPortalUrl } from "@/lib/gardenCleaners";

export default function PortalRedirectPage() {
  redirect(getGardenCleanersPortalUrl());
}
