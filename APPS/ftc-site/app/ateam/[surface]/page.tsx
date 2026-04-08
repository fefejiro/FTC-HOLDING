export const runtime = "edge";

import { redirect } from "next/navigation";
import { ATEAM_SITE_URL } from "../../../lib/site";

type RouteProps = {
  params: {
    surface: string;
  };
};

export const dynamicParams = true;

export default function AteamSurfacePage({ params }: RouteProps) {
  const safeSurface = String(params.surface || "").trim().toLowerCase();
  if (!safeSurface) {
    redirect(ATEAM_SITE_URL);
  }
  const destination = new URL(`/${safeSurface}`, ATEAM_SITE_URL);
  redirect(destination.toString());
}
