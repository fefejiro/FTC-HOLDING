import type { Metadata } from "next";
import AteamSurfaceShell from "./AteamSurfaceShell";

export const metadata: Metadata = {
  title: "ATEAM | Una Labs",
  description:
    "Open the real local ATEAM Office, Memory, Team, Factory, and Pipeline surfaces from inside Una Labs.",
  alternates: {
    canonical: "/ateam"
  }
};

export default function AteamPage() {
  return <AteamSurfaceShell surfaceKey="office" />;
}
