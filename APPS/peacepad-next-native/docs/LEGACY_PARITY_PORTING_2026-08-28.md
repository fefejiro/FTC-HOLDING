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

## Legacy parity slice: weather-aware activity ideas

The next port reuses the maintained web activity journey from
`C:\FTC HOLDING\APPS\peacepad\client\src\pages\weather-activities.tsx`.
The legacy behavior resolves a place, asks Open-Meteo for the current
temperature and weather code, maps that response to the existing activity
catalogue conditions, and filters suitable ideas.

Native V2 keeps the existing `ActivitySuggestions` catalog and adds:

- `src/activities/weather.ts` for the pure Open-Meteo mapping, bounded place
  lookup, response validation, and provider error handling;
- an explicit typed city/region lookup on `ActivitySuggestionsScreen` that
  applies the returned weather condition to the existing filter;
- concise localized weather labels and summaries in EN/FR/ES.

This port does not request device location, run a background lookup, create
an account, persist location, or write application data. Weather lookup is
user-triggered and provider failures remain visible so the app never invents
conditions. The mapping preserves the legacy rain, snow, cloud, hot (>28 C),
and cold (<5 C) rules.

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

The weather slice adds:

- `node node_modules/jest/bin/jest.js src/activities/weather.test.ts src/activities/ActivitySuggestions.test.ts src/activities/activityLocalization.test.ts --runInBand --verbose --forceExit`
  - validates the legacy condition mapping, temperature overrides, typed place
    validation, minimal current-weather request, and malformed/unavailable
    provider responses.

The exact pass counts for the weather slice are recorded only after this
source is run through the focused test, typecheck, guardrail, secret-scan, and
diff checks. On 2026-08-28, the focused run passed 3 suites and 9 tests;
TypeScript, native guardrails, the 165-file secret scan, and `git diff --check`
also passed. The Jest run took 53.9 seconds on the Windows worktree after a
cold cache.

## Next parity slice

Port the next user-facing legacy journey only after choosing its existing
native contract (likely weather/activity suggestions or legacy records). Keep
the same rule: adapt proven behavior into current native interfaces, add pure
tests first, and do not widen production writes or invent a parallel backend.
