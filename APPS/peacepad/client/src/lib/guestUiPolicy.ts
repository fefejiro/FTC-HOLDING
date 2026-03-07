const GUEST_UI_OVERRIDE_KEY = "peacepad_internal_guest_ui";
const GUEST_UI_QUERY_PARAM = "qaGuestUi";

function readWindowOverride(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  const queryValue = params.get(GUEST_UI_QUERY_PARAM);

  if (queryValue === "1") {
    localStorage.setItem(GUEST_UI_OVERRIDE_KEY, "true");
  } else if (queryValue === "0") {
    localStorage.removeItem(GUEST_UI_OVERRIDE_KEY);
  }

  return localStorage.getItem(GUEST_UI_OVERRIDE_KEY) === "true";
}

export function isGuestUiEnabled(): boolean {
  if (import.meta.env.DEV) {
    return true;
  }

  return readWindowOverride();
}
