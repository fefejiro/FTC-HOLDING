import { activityCopy } from "./activityLocalization";

describe("activity localization", () => {
  it("keeps translated labels and singular/plural result copy intact", () => {
    const french = activityCopy("fr");
    expect(french.title).toBe("Idées d'activités");
    expect(french.weatherChoices.sunny).toBe("Ensoleillé");
    expect(french.result(1)).toContain("1 idée");
    expect(french.result(2)).toContain("2 idées");

    const spanish = activityCopy("es");
    expect(spanish.title).toBe("Ideas de actividades");
    expect(spanish.weatherChoices.cold).toBe("Frío");
    expect(spanish.plan("Picnic")).toContain("Picnic");
    expect(spanish.result(1)).toBe("1 idea");
    expect(spanish.result(2)).toBe("2 ideas");

    expect(activityCopy("en").result(1)).toBe("1 idea");
    expect(activityCopy("en").result(0)).toBe("0 ideas");
  });
});
