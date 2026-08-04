# Simulator interaction proof

These Maestro flows exercise the remaining high-value coordination interactions without relying on remote pointer control.

They run only against Expo Go and the isolated PeacePad lab configuration. Start Metro with the appropriate deterministic screen, then pass its local URL to the flow:

```bash
EXPO_PUBLIC_PEACEPAD_LAB_START_SCREEN=invite npx expo start --localhost --port 8094
maestro --device <FRESH_SIMULATOR_UDID> test -e EXPO_URL=exp://127.0.0.1:8094 e2e/maestro/bootstrap-expo-go.yaml
maestro --device <SIMULATOR_UDID> test -e EXPO_URL=exp://127.0.0.1:8094 e2e/maestro/invitation-qr.yaml

EXPO_PUBLIC_PEACEPAD_LAB_START_SCREEN=calendar npx expo start --localhost --port 8095
maestro --device <SIMULATOR_UDID> test -e EXPO_URL=exp://127.0.0.1:8095 e2e/maestro/calendar-sharing.yaml
```

Run the bootstrap flow only on a newly created Simulator where iOS still asks
permission to open Expo Go and Expo Go still shows its first-run developer
menu explanation. The product flows assume that one-time setup has completed.

The lab bundle remains `ca.peacepad.nextnative.lab`; production writes must remain disabled. These flows use synthetic in-memory state only.
