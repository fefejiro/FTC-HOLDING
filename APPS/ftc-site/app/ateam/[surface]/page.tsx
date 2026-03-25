import { redirect } from "next/navigation";
<<<<<<< HEAD
=======
import { isAteamOperatorEnabled } from "../../../lib/ateamOperator";
>>>>>>> e0043d3766030189eb9f193464e8bdacbb67235b

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
<<<<<<< HEAD
=======
  if (!isAteamOperatorEnabled()) {
    redirect("/ateam");
  }
>>>>>>> e0043d3766030189eb9f193464e8bdacbb67235b
  redirect(`/ateam/operator/${safeSurface}`);
}
