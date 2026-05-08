import AteamLandingExperience from "../../components/AteamLandingExperience";
import AteamSurfaceShell from "../AteamSurfaceShell";
import { resolveAteamLocalSurface } from "../../../lib/ateamEmbed";

type RouteProps = {
  params: {
    surface: string;
  };
};

export const dynamicParams = true;

export default function AteamSurfacePage({ params }: RouteProps) {
  const safeSurface = resolveAteamLocalSurface(params.surface);
  if (safeSurface === "office") {
    return <AteamLandingExperience basePath="/ateam" />;
  }

  return <AteamSurfaceShell surfaceKey={safeSurface} />;
}
