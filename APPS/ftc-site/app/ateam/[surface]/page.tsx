import { redirect } from "next/navigation";

type RouteProps = {
  params: {
    surface: string;
  };
};

export const dynamicParams = true;

export default function AteamSurfacePage({ params }: RouteProps) {
  const safeSurface = String(params.surface || "").trim().toLowerCase();
  if (!safeSurface) {
    redirect("/ateam");
  }
  redirect(`/ateam/operator/${safeSurface}`);
}
