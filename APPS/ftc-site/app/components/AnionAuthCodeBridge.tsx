"use client";

import { useEffect } from "react";

const ANION_AUTH_CALLBACK_URL = "https://anion.unalabs.cloud/auth/callback";

function hasAuthPayload(search: string, hash: string) {
  const searchParams = new URLSearchParams(search);
  const hashParams = new URLSearchParams(hash.replace(/^#/, ""));

  return (
    searchParams.has("code") ||
    searchParams.has("error") ||
    hashParams.has("access_token") ||
    hashParams.has("refresh_token") ||
    hashParams.has("error")
  );
}

export default function AnionAuthCodeBridge() {
  useEffect(() => {
    const { search, hash } = window.location;
    if (!hasAuthPayload(search, hash)) return;

    const callbackUrl = new URL(ANION_AUTH_CALLBACK_URL);
    callbackUrl.search = search;
    callbackUrl.hash = hash;
    window.location.replace(callbackUrl.toString());
  }, []);

  return null;
}
