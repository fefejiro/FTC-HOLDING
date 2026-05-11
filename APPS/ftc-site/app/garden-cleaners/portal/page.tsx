export const dynamic = "force-static";
import GardenClientPortalPage, { metadata } from "../../portal/page";

export { metadata };

export default function GardenClientPortalLegacyRedirectPage() {
  return <GardenClientPortalPage />;
}
