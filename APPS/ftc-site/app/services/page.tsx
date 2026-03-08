import { permanentRedirect } from "next/navigation";

export default function ServicesRedirectPage() {
  permanentRedirect("/capabilities");
}
