import { describe, expect, it } from "vitest";
import {
  AHARA_VIHARA_ORDER,
  DASHAVIDHA_ORDER,
  HISTORY_ORDER,
  ROS_ORDER,
  SOCRATES_ORDER,
  applyExtraction,
  applySlotAnswer,
  applyYesNo,
  canCompleteIntake,
  createInitialState,
  nextQuestion,
  plainLanguageRecap,
  type IntakeState,
  type Slot,
} from "@/lib/intake/engine";

function filled(value = "answered"): Slot {
  return { value, status: "patient_confirmed", confidence: 1, source: "patient" };
}

function fillGroup<K extends string>(keys: readonly K[], value = "answered"): Record<K, Slot> {
  return Object.fromEntries(keys.map((k) => [k, filled(value)])) as Record<K, Slot>;
}

function allRedFlagsCleared(): Record<string, boolean | null> {
  return {
    chest_pain: false,
    breathing: false,
    bleeding: false,
    stroke: false,
    abdomen: false,
    pediatric: false,
    self_harm: false,
  };
}

function afterPatientState(pathway: IntakeState["pathway"] = "ayush"): IntakeState {
  const state = createInitialState();
  return {
    ...state,
    phase: "socrates",
    languageCode: "hi-IN",
    answeredBy: "patient",
    pathway,
  };
}

describe("canonical AYUSH spine", () => {
  it("starts with chief complaint after patient state, not red flags", () => {
    const q = nextQuestion(afterPatientState());
    expect(q.kind).toBe("ask");
    if (q.kind === "ask") {
      expect(q.group).toBe("socrates");
      expect(q.id).toBe("chiefComplaint");
    }
  });

  it("asks remaining SOCRATES after chief complaint, site, and onset are filled", () => {
    const filledSlots = applyExtraction(afterPatientState(), {
      chiefComplaint: "abdominal pain",
      site: "right abdomen",
      onset: "yesterday",
      exacerbatingRelieving: "after eating",
    });
    const q = nextQuestion(filledSlots);
    expect(q.kind).toBe("ask");
    if (q.kind === "ask") {
      expect(q.id).toBe("character");
    }
  });

  it("asks ROS (clinical history) after SOCRATES, before medicines", () => {
    const state = {
      ...afterPatientState(),
      socrates: fillGroup(SOCRATES_ORDER),
    };
    const q = nextQuestion(state);
    expect(q.kind).toBe("ask");
    if (q.kind === "ask") {
      expect(q.group).toBe("ros");
      expect(q.id).toBe("cardiovascular");
    }
  });

  it("asks Dashavidha prakriti after ROS on AYUSH pathway", () => {
    const state = {
      ...afterPatientState("ayush"),
      socrates: fillGroup(SOCRATES_ORDER),
      ros: fillGroup(ROS_ORDER),
    };
    const q = nextQuestion(state);
    expect(q.kind).toBe("ask");
    if (q.kind === "ask") {
      expect(q.group).toBe("dashavidha");
      expect(q.id).toBe("prakriti");
    }
  });

  it("uses Dashavidha keys prakriti, vikriti, agni, satva in that order", () => {
    expect(DASHAVIDHA_ORDER.slice(0, 4)).toEqual(["prakriti", "vikriti", "agni", "satva"]);
    expect(DASHAVIDHA_ORDER).toHaveLength(10);
    expect(DASHAVIDHA_ORDER).not.toContain("aharaShakti");
    expect(DASHAVIDHA_ORDER).not.toContain("sattva");
  });

  it("asks Agni after Vikriti is filled", () => {
    const state = {
      ...afterPatientState("ayush"),
      phase: "dashavidha" as const,
      socrates: fillGroup(SOCRATES_ORDER),
      ros: fillGroup(ROS_ORDER),
      dashavidha: {
        ...createInitialState().dashavidha,
        prakriti: filled("medium"),
        vikriti: filled("new pain"),
      },
    };
    const q = nextQuestion(state);
    expect(q.kind).toBe("ask");
    if (q.kind === "ask") {
      expect(q.id).toBe("agni");
    }
  });

  it("asks Ahara-Vihara after Dashavidha is complete", () => {
    const state = {
      ...afterPatientState("ayush"),
      phase: "dashavidha" as const,
      socrates: fillGroup(SOCRATES_ORDER),
      ros: fillGroup(ROS_ORDER),
      dashavidha: fillGroup(DASHAVIDHA_ORDER),
    };
    const q = nextQuestion(state);
    expect(q.kind).toBe("ask");
    if (q.kind === "ask") {
      expect(q.group).toBe("aharaVihara");
      expect(q.id).toBe("mealTimes");
    }
  });

  it("asks medicines after Ahara-Vihara, not before Dashavidha", () => {
    const state = {
      ...afterPatientState("ayush"),
      phase: "aharaVihara" as const,
      socrates: fillGroup(SOCRATES_ORDER),
      ros: fillGroup(ROS_ORDER),
      dashavidha: fillGroup(DASHAVIDHA_ORDER),
      aharaVihara: fillGroup(AHARA_VIHARA_ORDER),
    };
    const q = nextQuestion(state);
    expect(q.kind).toBe("ask");
    if (q.kind === "ask") {
      expect(q.group).toBe("history");
      expect(q.id).toBe(HISTORY_ORDER[0]);
    }
  });

  it("runs full red-flag screening after medication and past history", () => {
    const state = {
      ...afterPatientState("ayush"),
      phase: "history" as const,
      socrates: fillGroup(SOCRATES_ORDER),
      ros: fillGroup(ROS_ORDER),
      dashavidha: fillGroup(DASHAVIDHA_ORDER),
      aharaVihara: fillGroup(AHARA_VIHARA_ORDER),
      history: fillGroup(HISTORY_ORDER),
    };
    const q = nextQuestion(state);
    expect(q.kind).toBe("ask");
    if (q.kind === "ask") {
      expect(q.group).toBe("redFlag");
      expect(q.id).toBe("chest_pain");
    }
  });

  it("escalates immediately if a red-flag symptom is reported during SOCRATES", () => {
    const next = applySlotAnswer(
      afterPatientState(),
      "socrates",
      "chiefComplaint",
      "severe chest pain and pressure right now"
    );
    expect(next.phase).toBe("escalated");
    expect(next.redFlagEvents[0]?.questionId).toBe("chest_pain");
  });

  it("escalates immediately on a red-flag yes during the screening pass", () => {
    const inFlags = {
      ...afterPatientState(),
      phase: "redFlag" as const,
    };
    const next = applyYesNo(inFlags, "chest_pain", true);
    expect(next.phase).toBe("escalated");
  });

  it("blocks completion if allergies were skipped", () => {
    const almost = {
      ...afterPatientState("allopathic"),
      phase: "recap" as const,
      patientRecapConfirmed: true,
      redFlags: allRedFlagsCleared(),
      socrates: fillGroup(SOCRATES_ORDER),
      ros: fillGroup(ROS_ORDER),
      aharaVihara: fillGroup(AHARA_VIHARA_ORDER),
      history: {
        ...fillGroup(HISTORY_ORDER),
        allergies: { value: "", status: "empty" as const, confidence: 0, source: "patient" as const },
      },
    };
    const result = canCompleteIntake(almost);
    expect(result.ok).toBe(false);
    expect(result.reasons.some((r) => r.includes("allerg"))).toBe(true);
  });

  it("allows AYUSH complete when Agni is clinician_to_assess", () => {
    const factors = fillGroup(DASHAVIDHA_ORDER);
    factors.agni = {
      value: "",
      status: "clinician_to_assess",
      confidence: 1,
      source: "patient",
    };
    const visit = {
      ...afterPatientState("ayush"),
      phase: "recap" as const,
      patientRecapConfirmed: true,
      redFlags: allRedFlagsCleared(),
      socrates: fillGroup(SOCRATES_ORDER),
      ros: fillGroup(ROS_ORDER),
      history: {
        ...fillGroup(HISTORY_ORDER),
        currentMedicines: filled("none known"),
        allergies: filled("none known"),
      },
      dashavidha: factors,
      aharaVihara: fillGroup(AHARA_VIHARA_ORDER),
    };
    expect(canCompleteIntake(visit).ok).toBe(true);
  });

  it("blocks completion when a must-ask Ahara-Vihara field is empty", () => {
    const visit = {
      ...afterPatientState("allopathic"),
      phase: "recap" as const,
      patientRecapConfirmed: true,
      redFlags: allRedFlagsCleared(),
      history: {
        ...fillGroup(HISTORY_ORDER),
        currentMedicines: filled("none known"),
        allergies: filled("none known"),
      },
    };
    const result = canCompleteIntake(visit);
    expect(result.ok).toBe(false);
    expect(result.reasons.some((r) => /mealTimes|Ahara-Vihara/i.test(r))).toBe(true);
  });

  it("includes Ahara-Vihara must-ask answers in the recap", () => {
    let visit = afterPatientState("allopathic");
    visit = applySlotAnswer(visit, "aharaVihara", "mealTimes", "8am / 1pm / 8pm");
    visit = applySlotAnswer(visit, "aharaVihara", "dietType", "vegetarian");
    visit = applySlotAnswer(visit, "aharaVihara", "sleep", "10pm to 6am");
    visit = applySlotAnswer(visit, "aharaVihara", "waterIntake", "8 glasses");
    visit = applySlotAnswer(visit, "aharaVihara", "teaCoffeeSubstances", "tea twice a day");
    const recap = plainLanguageRecap(visit);
    expect(recap).toMatch(/8am \/ 1pm \/ 8pm/);
    expect(recap).toMatch(/vegetarian/);
    expect(recap).toMatch(/10pm to 6am/);
    expect(recap).toMatch(/8 glasses/);
    expect(recap).toMatch(/tea twice a day/);
  });
});
