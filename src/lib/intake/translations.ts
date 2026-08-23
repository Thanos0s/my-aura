export type TranslatedPrompt = {
  text: string;
  chips?: string[];
};

export type LanguageTranslations = {
  prompts: Record<string, TranslatedPrompt>;
  redFlags: Record<string, string>;
  yesNo: [string, string];
};

export const HINDI_TRANSLATIONS: LanguageTranslations = {
  yesNo: ["हाँ", "नहीं"],
  redFlags: {
    chest_pain: "क्या अभी आपको सीने में दर्द या भारी दबाव महसूस हो रहा है?",
    breathing: "क्या आपको सांस लेने में कोई कठिनाई या तकलीफ हो रही है?",
    bleeding: "क्या शरीर से बहुत अधिक या अनियंत्रित खून बह रहा है?",
    stroke: "क्या अचानक कमजोरी, चेहरे/हाथ में सुन्नपन या बोलने में लड़खड़ाहट है?",
    abdomen: "क्या पेट में बहुत तेज या असहनीय दर्द है?",
    pediatric: "यदि यह छोटा बच्चा है: क्या बहुत तेज बुखार या अत्यधिक सुस्ती है?",
    self_harm: "क्या खुद को या किसी अन्य को नुकसान पहुंचाने का कोई विचार है? (हाँ कहने पर तुरंत मेडिकल स्टाफ उपस्थित होगा)",
  },
  prompts: {
    chiefComplaint: {
      text: "आज आपको क्या मुख्य समस्या या तकलीफ है?",
      chips: ["दर्द", "बुखार", "खांसी", "कमजोरी", "पेट दर्द", "उल्टी / दस्त", "सिरदर्द"],
    },
    site: {
      text: "यह तकलीफ शरीर में ठीक कहाँ पर महसूस हो रही है?",
      chips: ["सिर", "छाती", "पेट", "पीठ", "गला", "जोड़ों में", "पूरे शरीर में"],
    },
    onset: {
      text: "यह कब शुरू हुआ? अचानक हुआ या धीरे-धीरे?",
      chips: ["अचानक", "धीरे-धीरे", "आज ही", "कल", "कुछ दिनों पहले", "एक हफ्ते से"],
    },
    character: {
      text: "यह किस प्रकार का दर्द या तकलीफ है — तेज़ चुभन, हल्का दर्द, जलन या मरोड़?",
      chips: ["तेज़ चुभन", "हल्का दर्द", "जलन", "मरोड़ / ऐंठन", "भारीपन"],
    },
    radiation: {
      text: "क्या यह दर्द कहीं और भी फैलता है?",
      chips: ["कहीं नहीं", "पीठ की तरफ", "बांह / हाथ में", "जबड़े / गर्दन की तरफ", "पैरों में"],
    },
    associated: {
      text: "क्या इसके साथ कुछ और भी महसूस हो रहा है — जैसे बुखार, जी मिचलाना या उल्टी?",
      chips: ["कुछ नहीं", "बुखार", "जी मिचलाना", "उल्टी", "चक्कर आना", "पसीना"],
    },
    timing: {
      text: "क्या यह तकलीफ लगातार बनी रहती है या आती-जाती रहती है?",
      chips: ["लगातार", "आती-जाती रहती है", "सुबह ज्यादा", "रात में ज्यादा"],
    },
    exacerbatingRelieving: {
      text: "क्या किसी चीज़ से यह बढ़ता या घटता है — जैसे खाना, चलना, या आराम करना?",
      chips: ["खाना खाने से", "चलने-फिरने से", "आराम करने से", "दवा से", "कुछ नहीं"],
    },
    severity: {
      text: "1 से 10 के पैमाने पर, अभी यह तकलीफ कितनी गंभीर है?",
      chips: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    },
    cardiovascular: {
      text: "क्या सीने में भारीपन, दिल की धड़कन तेज होना या पैरों में सूजन है?",
      chips: ["नहीं", "हाँ"],
    },
    respiratory: {
      text: "क्या खांसी, सांस फूलना या घरघराहट की आवाज आती है?",
      chips: ["नहीं", "हाँ"],
    },
    gi: {
      text: "क्या भूख में कमी, पेट खराब, कब्ज या उल्टी की शिकायत है?",
      chips: ["नहीं", "हाँ"],
    },
    genitourinary: {
      text: "क्या पेशाब में जलन या पेशाब के रंग/मात्रा में कोई बदलाव है?",
      chips: ["नहीं", "हाँ"],
    },
    neurological: {
      text: "क्या सिरदर्द, चक्कर आना, सुन्नपन या आंखों के आगे अंधेरा छाना होता है?",
      chips: ["नहीं", "हाँ"],
    },
    musculoskeletal: {
      text: "क्या जोड़ों में दर्द, सूजन या सुबह अकड़न रहती है?",
      chips: ["नहीं", "हाँ"],
    },
    skin: {
      text: "क्या त्वचा पर कोई दाने, खुजली या चकत्ते हैं?",
      chips: ["नहीं", "हाँ"],
    },
    prakriti: {
      text: "आपकी शारीरिक बनावट और त्वचा कैसी है — दुबली/रूखी, मध्यम, या भारी/तैलीय? सामान्यतः भूख कैसी रहती है?",
      chips: ["दुबली / रूखी (वात)", "मध्यम (पित्त)", "भारी / तैलीय (कफ)"],
    },
    vikriti: {
      text: "वर्तमान में आपको मुख्य असंतुलन क्या लग रहा है और यह कब से है?",
      chips: ["पेट में गैस/एसिडिटी", "जोड़ों का दर्द", "थकान व सुस्ती", "अनिद्रा"],
    },
    agni: {
      text: "आपकी भूख और पाचन शक्ति (अग्नि) कैसी है — सामान्य भूख, भारीपन या खट्टी डकारें?",
      chips: ["सामान्य भूख (सम अग्नि)", "अनियमित भूख (विषम)", "तीव्र भूख / एसिडिटी (तीक्ष्ण)", "मंद भूख / भारीपन (मंद)"],
    },
    satva: {
      text: "आप तनाव को कैसे संभालते हैं? क्या रात को गहरी और अच्छी नींद आती है?",
      chips: ["अच्छी नींद", "नींद में बाधा", "जल्दी तनावग्रस्त", "सामान्य मनोबल"],
    },
    sara: {
      text: "दिनभर में आपकी ऊर्जा और स्फूर्ति कैसी रहती है? क्या चोट जल्दी ठीक होती है?",
      chips: ["कम ऊर्जा / थकान", "सामान्य", "उच्च ऊर्जा"],
    },
    samhanana: {
      text: "आपकी ऊंचाई (कद) और वजन कितना है?",
      chips: ["कद व वजन बताएं"],
    },
    pramana: {
      text: "कृपया अपने शरीर की ऊंचाई और वजन की पुष्टि करें।",
      chips: ["पुष्टि करें"],
    },
    satmya: {
      text: "क्या ऐसा कोई भोजन, ठंडा/गर्म मौसम या पदार्थ है जो आपको सूट नहीं करता (असात्म्य)?",
      chips: ["ठंडी चीजें", "तली-भुनी चीजें", "दूध/दही", "धूल/धुआं", "कोई नहीं"],
    },
    vyayamaShakti: {
      text: "आपकी व्यायाम और शारीरिक परिश्रम करने की क्षमता कैसी है? काम के बाद ऊर्जा रहती है या थक जाते हैं?",
      chips: ["कम / जल्दी थकान", "मध्यम", "उत्कृष्ट क्षमता"],
    },
    vaya: {
      text: "आपकी वर्तमान आयु या जन्मतिथि क्या है?",
      chips: ["आयु बताएं"],
    },
    mealTimes: {
      text: "आप आमतौर पर भोजन किस समय करते हैं?",
      chips: ["नियमित समय पर", "अनियमित", "सुबह नाश्ता नहीं", "देर रात भोजन"],
    },
    dietType: {
      text: "आपका आहार किस प्रकार का है — शाकाहारी, मांसाहारी, सात्विक या उपवास रखते हैं?",
      chips: ["शाकाहारी", "मांसाहारी", "मिश्रित", "सात्विक", "उपवास रखते हैं"],
    },
    sleep: {
      text: "आपकी रोजाना की नींद कैसी है?",
      chips: ["6 घंटे", "7–8 घंटे", "6 घंटे से कम", "टूटी-फूटी नींद"],
    },
    waterIntake: {
      text: "आप दिनभर में लगभग कितना पानी पीते हैं?",
      chips: ["<4 गिलास", "4–6 गिलास", "7–8 गिलास", "8 गिलास से अधिक"],
    },
    teaCoffeeSubstances: {
      text: "क्या आप चाय, कॉफी, तंबाकू या अन्य किसी पदार्थ का नियमित सेवन करते हैं?",
      chips: ["कुछ नहीं", "चाय", "कॉफी", "दोनों", "अन्य"],
    },
    chronicConditions: {
      text: "क्या आपको पहले से कोई पुरानी बीमारी है — जैसे मधुमेह (शुगर), बीपी, थायरॉइड या हृदय रोग?",
      chips: ["कोई नहीं", "मधुमेह (शुगर)", "उच्च रक्तचाप (बीपी)", "थायरॉइड", "हृदय रोग"],
    },
    surgeries: {
      text: "क्या पहले कोई ऑपरेशन या अस्पताल में भर्ती हुए हैं?",
      chips: ["कोई नहीं", "ऑपरेशन हुआ है", "अस्पताल में भर्ती"],
    },
    currentMedicines: {
      text: "वर्तमान में आप कौन-सी दवाएं या आयुर्वेदिक औषधियां ले रहे हैं?",
      chips: ["कोई नहीं"],
    },
    allergies: {
      text: "क्या आपको किसी दवा, धूल या खाने की चीज से एलर्जी है?",
      chips: ["कोई एलर्जी नहीं"],
    },
    familyHistory: {
      text: "क्या परिवार में किसी को शुगर, बीपी, हृदय रोग या कैंसर की बीमारी है?",
      chips: ["कोई नहीं", "मधुमेह", "हृदय रोग", "कैंसर"],
    },
    substanceUse: {
      text: "क्या आप धूम्रपान, शराब या तंबाकू का सेवन करते हैं?",
      chips: ["नहीं", "धूम्रपान", "शराब", "तंबाकू"],
    },
    occupation: {
      text: "आपका व्यवसाय या कार्य क्या है? क्या इसमें अधिक शारीरिक श्रम या धूप-धूल का सामना है?",
      chips: ["बैठकर काम (डेस्क)", "शारीरिक श्रम", "फील्ड वर्क", "अन्य"],
    },
  },
};

export const ENGLISH_TRANSLATIONS: LanguageTranslations = {
  yesNo: ["Yes", "No"],
  redFlags: {
    chest_pain: "Are you having chest pain or pressure right now?",
    breathing: "Any difficulty breathing?",
    bleeding: "Any severe or uncontrolled bleeding?",
    stroke: "Sudden weakness, numbness, or slurred speech?",
    abdomen: "Severe abdominal pain?",
    pediatric: "If this is an infant: high fever or unusual drowsiness?",
    self_harm: "Any thoughts of harming yourself or others? If yes, we will call staff immediately — this is not handled by the computer alone.",
  },
  prompts: {
    chiefComplaint: { text: "What is the main problem that brought you here today?", chips: ["Pain", "Fever", "Cough", "Weakness", "Stomach Ache", "Headache"] },
    site: { text: "Where exactly do you feel it?", chips: ["Head", "Chest", "Abdomen", "Back", "Throat", "Joints", "Whole body"] },
    onset: { text: "When did it start? Was it sudden or gradual?", chips: ["sudden", "gradual", "today", "yesterday", "days ago"] },
    character: { text: "How would you describe it — sharp, dull, burning, or cramping?", chips: ["sharp", "dull", "burning", "cramping"] },
    radiation: { text: "Does it spread anywhere else?", chips: ["no", "to back", "to arm", "to jaw"] },
    associated: { text: "Is anything else happening along with it — fever, nausea, vomiting?", chips: ["none", "fever", "nausea", "vomiting"] },
    timing: { text: "Is it constant, or does it come and go?", chips: ["constant", "comes and goes"] },
    exacerbatingRelieving: { text: "Does anything make it better or worse — food, movement, rest?", chips: ["food", "movement", "rest", "nothing"] },
    severity: { text: "On a scale of 1 to 10, how bad is it right now?", chips: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"] },
    cardiovascular: { text: "Any chest discomfort, palpitations, or swelling of legs?", chips: ["no", "yes"] },
    respiratory: { text: "Any cough, wheeze, or shortness of breath at rest?", chips: ["no", "yes"] },
    gi: { text: "Any change in appetite, bowel habits, or vomiting?", chips: ["no", "yes"] },
    genitourinary: { text: "Any burning urination or change in urine?", chips: ["no", "yes"] },
    neurological: { text: "Any headache, dizziness, or numbness?", chips: ["no", "yes"] },
    musculoskeletal: { text: "Any joint pain or stiffness?", chips: ["no", "yes"] },
    skin: { text: "Any rash, itching, or new skin changes?", chips: ["no", "yes"] },
    prakriti: { text: "Is your body frame generally thin, medium, or heavy? How is your skin — dry, oily, or normal? How is appetite most days?", chips: ["thin / dry", "medium", "heavy / oily"] },
    vikriti: { text: "What is troubling you today, and when did you first notice it? Has this happened before?" },
    agni: { text: "How is your appetite and digestion — regular hunger, bloating, or discomfort after eating?", chips: ["regular", "irregular hunger", "bloating", "discomfort after meals"] },
    satva: { text: "How do you usually handle stress? Do you sleep well most nights?", chips: ["sleep well", "poor sleep", "stressed easily", "coping ok"] },
    sara: { text: "How would you rate your energy on a typical day? Do cuts or wounds heal quickly?", chips: ["low energy", "usual", "high"] },
    samhanana: { text: "What is your height and weight? (BMI will be calculated for the doctor.)" },
    pramana: { text: "Please confirm height, weight, and any other body measurements you know." },
    satmya: { text: "Are there foods, weather, or activities you have always been sensitive to?" },
    vyayamaShakti: { text: "How much physical activity do you get in a typical week? Energized or drained after?", chips: ["low energy", "moderate", "high stamina"] },
    vaya: { text: "What is your date of birth or age?" },
    mealTimes: { text: "What time do you usually eat your meals?", chips: ["irregular", "early", "late", "skip breakfast"] },
    dietType: { text: "Do you follow any specific diet — vegetarian, restricted, fasting days?", chips: ["vegetarian", "non-vegetarian", "mixed", "restricted", "fasting days"] },
    sleep: { text: "What is your typical sleep schedule?", chips: ["6 hours", "7–8 hours", "less than 6", "poor sleep"] },
    waterIntake: { text: "How much water do you drink in a day, roughly?", chips: ["<4 glasses", "4–6 glasses", "7–8 glasses", "more"] },
    teaCoffeeSubstances: { text: "Do you consume tea, coffee, or any addictive substances regularly?", chips: ["none", "tea", "coffee", "both", "other"] },
    chronicConditions: { text: "Have you been diagnosed with any long-term condition — diabetes, hypertension, thyroid, heart disease?", chips: ["none", "diabetes", "hypertension", "thyroid", "heart disease"] },
    surgeries: { text: "Any past surgeries or hospitalizations?", chips: ["none", "surgery", "hospitalized"] },
    currentMedicines: { text: "What medicines are you currently taking, including any Ayurvedic or herbal ones?", chips: ["none known"] },
    allergies: { text: "Any known drug or food allergies?", chips: ["none known"] },
    familyHistory: { text: "Does anyone in your immediate family have a similar condition, or diabetes, heart disease, or cancer?", chips: ["none known", "diabetes", "heart disease", "cancer"] },
    substanceUse: { text: "Do you smoke, drink alcohol, or use tobacco?", chips: ["no", "smoke", "alcohol", "tobacco"] },
    occupation: { text: "What is your occupation, and does it involve physical strain or exposure?" },
  },
};

const TRANSLATIONS: Record<string, LanguageTranslations> = {
  "hi-IN": HINDI_TRANSLATIONS,
  "hi": HINDI_TRANSLATIONS,
  "en-IN": ENGLISH_TRANSLATIONS,
  "en": ENGLISH_TRANSLATIONS,
};

export function getPromptTranslation(id: string, lang = "en-IN"): TranslatedPrompt {
  const langKey = lang.toLowerCase().startsWith("hi") ? "hi-IN" : "en-IN";
  const dict = TRANSLATIONS[langKey] ?? ENGLISH_TRANSLATIONS;
  return dict.prompts[id] ?? ENGLISH_TRANSLATIONS.prompts[id] ?? { text: id };
}

export function getRedFlagTranslation(id: string, lang = "en-IN"): string {
  const langKey = lang.toLowerCase().startsWith("hi") ? "hi-IN" : "en-IN";
  const dict = TRANSLATIONS[langKey] ?? ENGLISH_TRANSLATIONS;
  return dict.redFlags[id] ?? ENGLISH_TRANSLATIONS.redFlags[id] ?? id;
}

export function getYesNoTranslation(lang = "en-IN"): [string, string] {
  const langKey = lang.toLowerCase().startsWith("hi") ? "hi-IN" : "en-IN";
  const dict = TRANSLATIONS[langKey] ?? ENGLISH_TRANSLATIONS;
  return dict.yesNo;
}
