# PeacePad V2 Maestro Simulator Proof

## Boundary

- Device: disposable iPhone 17 Pro Simulator
- OS: iOS 26.5
- Product runtime source: `7f01845c876c5d9d44e7726929fd8a11cf303710`
- Proof definitions: `afefbe31`
- Bundle: `ca.peacepad.nextnative.lab`
- Visible app name: PeacePad
- Diagnostics: disabled
- Production writes: disabled
- Data: fictional and session-only
- Live Capacitor app and App Store record: untouched

## Results

| Flow | Result | Screenshot |
| --- | --- | --- |
| Create family invitation | PASSED | `01-invitation-qr.png` |
| Verify invitation code `P00001` and scannable QR | PASSED | `01-invitation-qr.png` |
| Share Parenting Time calendar with confirmation | PASSED | `02-calendar-shared.png` |
| Verify shared state through **Make private Parenting Time** | PASSED | `02-calendar-shared.png` |

Expo Go first-run onboarding was completed once through the checked-in
`bootstrap-expo-go.yaml` flow. Its one coordinate tap is limited to an
Expo-owned Continue control that is not exposed in the iOS accessibility tree.
All PeacePad product actions use named native accessibility elements.
