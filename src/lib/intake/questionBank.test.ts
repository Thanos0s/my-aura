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

  it("completes general_other after one history answer plus notes, without ROS", () => {
    let state = createInitialState("hi-IN");
    state = { ...state, phase: "socrates" };

    state = applySlotAnswer(state, "socrates", "chiefComplaint", "शरीर में परेशानी");
    expect(state.matchedComplaintId).toBe("general_other");

    state = applySlotAnswer(
      state,
      "socrates",
      "history_bundle",
      "नहीं मैंने कोई दवाई ली नहीं है यह मेरे को कुछ दिनों से है अक्सर होता है जांच करानी है"
    );

    const follow = nextQuestion(state);
    expect(follow.kind).toBe("complete");
  });


  it("covers duration and medicines from the full Hindi transcript, not sequential repeats", () => {
    let state = createInitialState("hi-IN");
    state = { ...state, phase: "socrates" };

    state = applySlotAnswer(state, "socrates", "chiefComplaint", "शरीर में परेशानी");
    const afterChief = nextQuestion(state);
    expect(afterChief.kind).toBe("ask");
    if (afterChief.kind === "ask") {
      expect(afterChief.id).not.toBe("chiefComplaint");
      expect(afterChief.id).not.toBe("character_location");
    }

    // Exact phrasing from kiosk STT: "I did not take medicine, this has been for a few days"
    state = applySlotAnswer(
      state,
      "socrates",
      afterChief.kind === "ask" ? afterChief.id : "trigger",
      "नहीं मैंने कोई दवाई ली नहीं है यह मेरे को कुछ दिनों से है"
    );

    expect(state.complaintAnswers?.onset).toBeTruthy();
    expect(state.complaintAnswers?.medication).toBeTruthy();

    const afterFacts = nextQuestion(state);
    expect(afterFacts.kind).toBe("ask");
    if (afterFacts.kind === "ask") {
      expect(["onset", "medication", "trigger", "character_location"]).not.toContain(afterFacts.id);
    }

    state = applySlotAnswer(state, "socrates", "pattern", "अक्सर होता है अक्सर होता है भैया अक्सर होता है");
    const afterPattern = nextQuestion(state);
    if (afterPattern.kind === "ask") {
      expect(afterPattern.id).not.toBe("pattern");
      expect(afterPattern.id).not.toBe("onset");
      expect(afterPattern.id).not.toBe("medication");
    }
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

  it("strictly enforces maximum 6 total questions and terminates to complete", () => {
    let state = createInitialState("hi-IN");
    state = { ...state, phase: "socrates" };

    // Turn 1: Chief Complaint
    state = applySlotAnswer(state, "socrates", "chiefComplaint", "पेट में दर्द");
    expect(nextQuestion(state).kind).toBe("ask");

    // Turn 2: Location
    state = applySlotAnswer(state, "socrates", "character_location", "ऊपरी पेट");
    expect(nextQuestion(state).kind).toBe("ask");

    // Turn 3: Trigger
    state = applySlotAnswer(state, "socrates", "trigger", "खाना खाने के बाद");
    expect(nextQuestion(state).kind).toBe("ask");

    // Turn 4: Onset
    state = applySlotAnswer(state, "socrates", "onset", "दो दिनों से");
    expect(nextQuestion(state).kind).toBe("ask");

    // Turn 5: Medication
    state = applySlotAnswer(state, "socrates", "medication", "कोई दवा नहीं ली");
    expect(nextQuestion(state).kind).toBe("ask");

    // Turn 6: Pattern
    state = applySlotAnswer(state, "socrates", "pattern", "पहली बार हुआ है");

    // Turn 6 reached: nextQuestion MUST return complete!
    const finish = nextQuestion(state);
    expect(finish.kind).toBe("complete");
    expect(state.chatHistory?.length).toBe(6);
  });
});

