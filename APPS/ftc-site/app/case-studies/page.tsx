export const dynamic = "force-static";

import { permanentRedirect } from "next/navigation";

export default function CaseStudiesRedirectPage() {
  permanentRedirect("/work");
}
