# Legacy parity port: parenting-time calendar

## Scope

This slice ports the working parenting-time schedule behavior from the
maintained Capacitor PeacePad app into the React Native calendar. It reuses the
native V2 `parenting-time` event contract and does not add a new API, database
table, provider, or production fixture.

## Legacy source of truth

- `C:\FTC HOLDING\APPS\peacepad\client\src\lib\custodyUtils.ts`
- `C:\FTC HOLDING\APPS\peacepad\client\src\components\CustodyCalendarView.tsx`
- `C:\FTC HOLDING\APPS\peacepad\client\src\components\CustodyScheduleBuilder.tsx`

The port preserves the three existing rules:

- alternating week on / week off;
- every other weekend (primary parent on weekdays);
- 2-2-3 rotation.

The native calculator uses UTC date-only arithmetic so the same start date
produces the same result on iOS, Android, and web. It fails closed for an
invalid date, a date before the plan starts, a disabled plan, or an unsafe
preview length.

## Native implementation

- `src/calendar/custodySchedule.ts` contains the pure rule calculator and
  bounded block compression.
- `src/calendar/custodyScheduleLocalization.ts` contains concise EN/FR/ES
  labels.
- `src/calendar/CustodySchedulePlanner.tsx` provides pattern, start-date, and
  starting-parent controls, a 28-day preview, and an explicit add action.
- `src/coordination/CoordinationScreens.tsx` overlays the selected plan on
  month/week/day calendar views and creates real `parenting-time` blocks only
  after the user presses **Add next 4 weeks to calendar**.

No event is created when the planner is merely opened or previewed. Repeated
adds skip exact generated blocks already present in the loaded calendar.

## Deliberate boundaries

The existing native V2 contract does not yet persist a partnership-level
custody configuration or expose legacy event creator identity. Therefore this
first port keeps the active plan in the calendar screen and materializes a
bounded, user-requested four-week set of events. It does not claim parity for
legacy vacation/holiday parent overrides, partnership-level save/edit, or an
unbounded recurring schedule. Those require a reviewed shared API contract so
the other authorized parent sees the same plan; they must not be faked with
local or production dummy data.

## Verification

- `node node_modules/jest/bin/jest.js src/calendar/custodySchedule.test.ts --runInBand --verbose --forceExit`
  - 1 suite passed, 6 tests passed.
- `node_modules/.bin/tsc.cmd --noEmit --pretty false`
  - passed with exit code 0.

The tests cover all three legacy patterns, invalid and pre-start dates,
disabled plans, unsafe preview lengths, and all-day block compression.

## Next parity slice

Port the next user-facing legacy journey only after choosing its existing
native contract (likely weather/activity suggestions or legacy records). Keep
the same rule: adapt proven behavior into current native interfaces, add pure
tests first, and do not widen production writes or invent a parallel backend.
