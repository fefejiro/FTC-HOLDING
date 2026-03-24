import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AteamSurfaceShell from "../AteamSurfaceShell";
import { ateamLocalSurfaceKeys, getAteamLocalSurface, resolveAteamLocalSurface } from "../../../lib/ateamEmbed";

type RouteProps = {
  params: {
    surface: string;
  };
};

export const dynamicParams = false;

export function generateStaticParams() {
  return ateamLocalSurfaceKeys.map((surface) => ({ surface }));
}

export function generateMetadata({ params }: RouteProps): Metadata {
  const resolvedKey = resolveAteamLocalSurface(params.surface);
  const surface = getAteamLocalSurface(resolvedKey);

  return {
    title: `${surface.label} | ATEAM | Una Labs`,
    description: surface.summary,
    alternates: {
      canonical: surface.href
    }
  };
}

export default function AteamSurfacePage({ params }: RouteProps) {
  const requested = String(params.surface || "").trim().toLowerCase();
  if (!ateamLocalSurfaceKeys.includes(requested as (typeof ateamLocalSurfaceKeys)[number])) {
    notFound();
  }

  return <AteamSurfaceShell surfaceKey={requested as (typeof ateamLocalSurfaceKeys)[number]} />;
}
