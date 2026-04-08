export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "edge";

import { permanentRedirect } from "next/navigation";
import { ATEAM_SITE_URL } from "../../lib/site";

export default function AteamPage() {
  permanentRedirect(ATEAM_SITE_URL);
}
