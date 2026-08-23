import { describe, expect, it } from "vitest";
import {
  matchChiefComplaint,
  QUESTION_BANK,
  buildDoctorClinicalSummary,
} from "./questionBank";
import {
  createInitialState,
  nextQuestion,
  applySlotAnswer,
} from "./engine";

describe("Chief-complaint question bank", () => {
  it("matches stomach ache in Hindi and English", () => {
    expect(matchChiefComplaint("पेट में").id).toBe("stomach_ache");
    expect(matchChiefComplaint("पेट में बहुत तेज दर्द है").id).toBe("stomach_ache");
    expect(matchChiefComplaint("I have stomach pain").id).toBe("stomach_ache");
    expect(matchChiefComplaint("my abdomen hurts").id).toBe("stomach_ache");
  });

  it("matches headache in Hindi and English", () => {
    expect(matchChiefComplaint("सिरदर्द").id).toBe("headache");
    expect(matchChiefComplaint("बहुत तेज सर दर्द है").id).toBe("headache");
    expect(matchChiefComplaint("severe migraine headache").id).toBe("headache");
  });

  it("matches fever in Hindi and English", () => {
    expect(matchChiefComplaint("बुखार है").id).toBe("fever");
    expect(matchChiefComplaint("high temperature and fever").id).toBe("fever");
  });

  it("identifies chest pain as red-flag complaint and escalates", () => {
    const matched = matchChiefComplaint("सीने में दर्द");
    expect(matched.id).toBe("chest_pain");
    expect(matched.redFlag).toBe(true);
    expect(matched.questions.length).toBe(3);
  });

  it("falls back to general_other when unmatched", () => {
    expect(matchChiefComplaint("something strange").id).toBe("general_other");
    expect(matchChiefComplaint("").id).toBe("general_other");
  });

  it("runs stomach_ache questions sequentially in Hindi", () => {
    let state = createInitialState("hi-IN");
    state = { ...state, phase: "socrates" };

    // 1. Initial question -> asks chief complaint
    const q1 = nextQuestion(state);
    expect(q1.kind).toBe("ask");
    if (q1.kind === "ask") {
      expect(q1.id).toBe("chiefComplaint");
      expect(q1.text).toContain("तकलीफ");
    }

    // 2. Patient answers "पेट में"
    state = applySlotAnswer(state, "socrates", "chiefComplaint", "पेट में");
    expect(state.matchedComplaintId).toBe("stomach_ache");

    // 3. Question 1 (character_location)
    const q2 = nextQuestion(state);
    expect(q2.kind).toBe("ask");
    if (q2.kind === "ask") {
      expect(q2.id).toBe("character_location");
      expect(q2.text).toContain("दर्द ठीक कहाँ हो रहा है");
      expect(q2.chips).toContain("पेट के ऊपरी हिस्से में");
    }

    // 4. Patient answers "नाभि के पास"
    state = applySlotAnswer(state, "socrates", "character_location", "नाभि के पास");

    // 5. Question 2 (trigger)
    const q3 = nextQuestion(state);
    expect(q3.kind).toBe("ask");
    if (q3.kind === "ask") {
      expect(q3.id).toBe("trigger");
      expect(q3.text).toContain("क्या खाया या पिया था");
    }
  });

  it("completes after answering all general_other questions without asking systemic ROS questions", () => {
    let state = createInitialState("hi-IN");
    state = { ...state, phase: "socrates" };

    // 1. Initial question
    state = applySlotAnswer(state, "socrates", "chiefComplaint", "शरीर में परेशानी");
    expect(state.matchedComplaintId).toBe("general_other");

    // 2. Question 1 (character_location)
    state = applySlotAnswer(state, "socrates", "character_location", "शरीर में परेशानी");

    // 3. Question 2 (trigger)
    state = applySlotAnswer(state, "socrates", "trigger", "नहीं मैंने कोई दवाई ली नहीं है");

    // 4. Question 3 (onset)
    state = applySlotAnswer(state, "socrates", "onset", "कुछ दिनों से");

    // 5. Question 4 (medication)
    state = applySlotAnswer(state, "socrates", "medication", "अक्सर होता है");

    // 6. Question 5 (pattern)
    state = applySlotAnswer(state, "socrates", "pattern", "बार-बार होता है");

    // 7. Question 6 (notes)
    state = applySlotAnswer(state, "socrates", "notes", "जांच करानी है");

    // Intake must now be complete! No ROS questions!
    const follow = nextQuestion(state);
    expect(follow.kind).toBe("complete");
  });


  it("skips already-answered complaint fields using chat history (no repeat questions)", () => {
    let state = createInitialState("hi-IN");
    state = { ...state, phase: "socrates" };

    state = applySlotAnswer(state, "socrates", "chiefComplaint", "शरीर में परेशानी");
    expect(state.matchedComplaintId).toBe("general_other");

    // Patient answers trigger with both "no medicine" and "few days" in one utterance
    state = applySlotAnswer(
      state,
      "socrates",
      "trigger",
      "नहीं मैंने कोई दवाई ली नहीं है यह मेरे को कुछ दिनों से है"
    );

    // onset + medication must be harvested from that answer and skipped
    expect(state.complaintAnswers?.onset).toBeTruthy();
    expect(state.complaintAnswers?.medication).toBeTruthy();

    const next = nextQuestion(state);
    expect(next.kind).toBe("ask");
    if (next.kind === "ask") {
      // Must NOT re-ask onset or medication
      expect(next.id).not.toBe("onset");
      expect(next.id).not.toBe("medication");
      expect(next.id).not.toBe("trigger");
    }
  });

  it("does not fall into ROS urine questions after general_other chat is finished", () => {
    let state = createInitialState("hi-IN");
    state = { ...state, phase: "socrates", pathway: "allopathic" };

    state = applySlotAnswer(state, "socrates", "chiefComplaint", "शरीर में परेशानी");
    state = applySlotAnswer(state, "socrates", "character_location", "शरीर में परेशानी");
    state = applySlotAnswer(
      state,
      "socrates",
      "trigger",
      "नहीं मैंने कोई दवाई ली नहीं है यह मेरे को कुछ दिनों से है"
    );
    state = applySlotAnswer(state, "socrates", "pattern", "बार-बार होता है अक्सर होता है");
    state = applySlotAnswer(state, "socrates", "notes", "जांच करानी है");

    // Simulate lost matchedComplaintId (persist/reload bug) — must still NOT ask ROS
    state = { ...state, matchedComplaintId: undefined };

    const follow = nextQuestion(state);
    expect(follow.kind).toBe("complete");
    if (follow.kind === "ask") {
      expect(follow.group).not.toBe("ros");
      expect(follow.id).not.toBe("genitourinary");
    }
  });

  it("generates a clear doctor clinical summary", () => {
    const stomach = QUESTION_BANK.find((c) => c.id === "stomach_ache")!;
    const summary = buildDoctorClinicalSummary(stomach, [
      { question: "Where is the pain", answer: "Around navel", field: "character_location" },
      { question: "What did you eat", answer: "Spicy food", field: "trigger" },
      { question: "Onset", answer: "Since morning", field: "onset" },
    ]);
    expect(summary).toContain("Chief Complaint: Stomach ache / Abdominal pain");
    expect(summary).toContain("Around navel");
    expect(summary).toContain("Spicy food");
  });
});
