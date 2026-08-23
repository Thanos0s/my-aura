export interface ComplaintQuestion {
  id: string;
  field: string;
  en: string;
  hi: string;
  chips_en?: string[];
  chips_hi?: string[];
}

export interface ComplaintDefinition {
  id: string;
  label: {
    en: string;
    hi: string;
  };
  matchKeywords: {
    en: string[];
    hi: string[];
  };
  redFlag: boolean;
  escalation_note?: string;
  note?: string;
  questions: ComplaintQuestion[];
}

export const QUESTION_BANK: ComplaintDefinition[] = [
  {
    id: "stomach_ache",
    label: {
      en: "Stomach ache / Abdominal pain",
      hi: "पेट दर्द",
    },
    matchKeywords: {
      en: [
        "stomach",
        "abdomen",
        "belly",
        "tummy ache",
        "stomach ache",
        "stomach pain",
        "abdominal pain",
        "belly pain",
        "gut pain",
        "cramps",
        "acidity",
        "gas",
        "indigestion",
      ],
      hi: [
        "पेट",
        "पेट दर्द",
        "पेट में दर्द",
        "पेट मे",
        "पेट में",
        "मरोड़",
        "पेट खराब",
        "गैस",
        "एसिडिटी",
        "कब्ज",
        "अपच",
      ],
    },
    redFlag: false,
    questions: [
      {
        id: "q1",
        field: "character_location",
        en: "Where exactly is the pain, and does it stay in one place or move around?",
        hi: "दर्द ठीक कहाँ हो रहा है, और क्या यह एक जगह पर रहता है या फैलता है?",
        chips_en: ["Upper abdomen", "Lower abdomen", "Around navel", "Stays in one place", "Spreads around"],
        chips_hi: ["पेट के ऊपरी हिस्से में", "निचले हिस्से में", "नाभि के पास", "एक ही जगह पर", "चारों तरफ फैलता है"],
      },
      {
        id: "q2",
        field: "trigger",
        en: "What did you eat or drink before the pain started?",
        hi: "दर्द शुरू होने से पहले आपने क्या खाया या पिया था?",
        chips_en: ["Normal home food", "Outside / oily food", "Spicy food", "Tea / coffee", "Nothing unusual"],
        chips_hi: ["सामान्य घर का खाना", "बाहर का / तला हुआ", "मसालेदार खाना", "चाय / कॉफी", "कुछ खास नहीं"],
      },
      {
        id: "q3",
        field: "onset",
        en: "Since when have you had this pain?",
        hi: "यह दर्द आपको कब से हो रहा है?",
        chips_en: ["Just today", "Since morning", "Since yesterday", "A few days ago", "More than a week"],
        chips_hi: ["आज से ही", "सुबह से", "कल से", "कुछ दिनों से", "एक हफ्ते से ज्यादा"],
      },
      {
        id: "q4",
        field: "medication",
        en: "Have you taken any medicine for it? If yes, did it help?",
        hi: "क्या आपने इसके लिए कोई दवा ली है? अगर हाँ, तो क्या उससे आराम मिला?",
        chips_en: ["No medicine yet", "Antacid / Gas medicine", "Painkiller (helped)", "Medicine didn't help", "Home remedy"],
        chips_hi: ["कोई दवा नहीं ली", "गैस / एसिडिटी की दवा", "दवा ली (आराम मिला)", "दवा से आराम नहीं मिला", "घरेलू नुस्खा / अजवाइन"],
      },
      {
        id: "q5",
        field: "pattern",
        en: "Does this happen often, or is this the first time?",
        hi: "क्या यह अक्सर होता है, या यह पहली बार है?",
        chips_en: ["First time", "Happens often", "Occasionally", "After heavy meals"],
        chips_hi: ["पहली बार हुआ है", "अक्सर होता है", "कभी-कभार", "ज्यादा खाने के बाद"],
      },
      {
        id: "q6",
        field: "notes",
        en: "Is there anything else about this you'd like to tell the doctor?",
        hi: "क्या इसके बारे में और कुछ है जो आप डॉक्टर को बताना चाहेंगे?",
        chips_en: ["Nothing else", "Also feel bloated", "Mild nausea", "Constipation"],
        chips_hi: ["और कुछ नहीं", "पेट फूला हुआ लग रहा है", "हल्का जी मिचलाना", "कब्ज की समस्या"],
      },
    ],
  },
  {
    id: "headache",
    label: {
      en: "Headache",
      hi: "सिरदर्द",
    },
    matchKeywords: {
      en: ["headache", "head pain", "migraine", "head ache", "forehead pain", "temple pain"],
      hi: ["सिरदर्द", "सिर दर्द", "सर दर्द", "सिर", "आधा सिर दर्द", "माइग्रेन", "सर में दर्द"],
    },
    redFlag: false,
    questions: [
      {
        id: "q1",
        field: "character_location",
        en: "Where is the headache — one side, both sides, forehead, or back of the head?",
        hi: "सिरदर्द कहाँ है — एक तरफ, दोनों तरफ, माथे में, या सिर के पीछे?",
        chips_en: ["One side (half head)", "Forehead / temples", "Both sides", "Back of the head", "Entire head"],
        chips_hi: ["एक तरफ (आधा सिर)", "माथे / कनपटी में", "दोनों तरफ", "सिर के पीछे", "पूरे सिर में"],
      },
      {
        id: "q2",
        field: "trigger",
        en: "Does anything bring it on — bright light, stress, lack of sleep, skipping meals?",
        hi: "क्या किसी चीज़ से यह शुरू होता है — तेज़ रोशनी, तनाव, नींद की कमी, खाना छोड़ना?",
        chips_en: ["Stress / screen time", "Lack of sleep", "Skipping meals", "Bright light / heat", "Not sure"],
        chips_hi: ["तनाव / स्क्रीन टाइम", "नींद की कमी", "भूखे रहने से", "धूप / तेज़ रोशनी", "पता नहीं"],
      },
      {
        id: "q3",
        field: "onset",
        en: "Since when have you had this headache?",
        hi: "यह सिरदर्द आपको कब से है?",
        chips_en: ["Just today", "Since morning", "Since yesterday", "A few days ago", "Recurring for weeks"],
        chips_hi: ["आज से ही", "सुबह से", "कल से", "कुछ दिनों से", "कई हफ्तों से बार-बार"],
      },
      {
        id: "q4",
        field: "medication",
        en: "Have you taken any medicine for it?",
        hi: "क्या आपने इसके लिए कोई दवा ली है?",
        chips_en: ["Paracetamol / Painkiller", "Balm / Oil massage", "Rest / Sleep helped", "No medicine yet"],
        chips_hi: ["पैरासिटामोल / दर्द की दवा", "बाम / तेल मालिश", "आराम करने से राहत", "कोई दवा नहीं ली"],
      },
      {
        id: "q5",
        field: "pattern",
        en: "Do you get headaches like this often?",
        hi: "क्या आपको ऐसा सिरदर्द अक्सर होता है?",
        chips_en: ["First time", "Happens frequently", "1-2 times a month", "Only with stress"],
        chips_hi: ["पहली बार", "अक्सर होता रहता है", "महीने में 1-2 बार", "केवल तनाव होने पर"],
      },
      {
        id: "q6",
        field: "notes",
        en: "Anything else — nausea, blurred vision, or anything unusual?",
        hi: "कुछ और बताना चाहेंगे — जी मिचलाना, धुंधला दिखना, या कोई और असामान्य बात?",
        chips_en: ["Nothing else", "Mild nausea", "Eye strain / blurred vision", "Dizziness"],
        chips_hi: ["और कुछ नहीं", "हल्का जी मिचलाना", "आंखों में भारीपन / धुंधलापन", "चक्कर आना"],
      },
    ],
  },
  {
    id: "fever",
    label: {
      en: "Fever",
      hi: "बुखार",
    },
    matchKeywords: {
      en: ["fever", "temperature", "chills", "feverish", "high temp", "hot body"],
      hi: ["बुखार", "ताप", "बदन गर्म", "हरारत", "ठंड लगकर बुखार", "ज्वर"],
    },
    redFlag: false,
    questions: [
      {
        id: "q1",
        field: "character_location",
        en: "How high does the fever feel, and have you measured it with a thermometer?",
        hi: "बुखार कितना तेज़ लगता है, और क्या आपने थर्मामीटर से नापा है?",
        chips_en: ["Measured (99°-101°F)", "High fever (>102°F)", "Mild warmth / feverish", "Not measured with thermometer"],
        chips_hi: ["नापा है (99°-101°F)", "तेज़ बुखार (>102°F)", "हल्की हरारत / गर्म बदन", "थर्मामीटर से नहीं नापा"],
      },
      {
        id: "q2",
        field: "trigger",
        en: "Does it come with chills, body ache, or sweating?",
        hi: "क्या इसके साथ ठंड लगना, बदन दर्द, या पसीना आना भी है?",
        chips_en: ["With chills / shivering", "Severe body ache", "Excessive sweating", "Only mild warmth"],
        chips_hi: ["ठंड / कंपकंपी के साथ", "तेज़ बदन दर्द", "बहुत पसीना आना", "सिर्फ हल्की गर्मी"],
      },
      {
        id: "q3",
        field: "onset",
        en: "Since when do you have the fever?",
        hi: "बुखार आपको कब से है?",
        chips_en: ["Since today", "Since last night", "2-3 days", "More than 5 days"],
        chips_hi: ["आज से", "कल रात से", "2-3 दिनों से", "5 दिनों से ज्यादा"],
      },
      {
        id: "q4",
        field: "medication",
        en: "Have you taken any medicine for the fever?",
        hi: "क्या आपने बुखार के लिए कोई दवा ली है?",
        chips_en: ["Paracetamol (fever reduced)", "Paracetamol (no relief)", "Cold sponging", "No medicine yet"],
        chips_hi: ["पैरासिटामोल ली (बुखार उतरा)", "पैरासिटामोल से राहत नहीं", "पानी की पट्टी रखी", "कोई दवा नहीं ली"],
      },
      {
        id: "q5",
        field: "pattern",
        en: "Is the fever constant, or does it come and go?",
        hi: "क्या बुखार लगातार है, या आता-जाता रहता है?",
        chips_en: ["Constant / continuous", "Comes in evening", "Comes and goes with medicine", "Only at night"],
        chips_hi: ["लगातार बना रहता है", "शाम को चढ़ता है", "दवा खाने पर उतरता है फिर आ जाता है", "सिर्फ रात में"],
      },
      {
        id: "q6",
        field: "notes",
        en: "Anything else — cough, rash, or recent travel?",
        hi: "कुछ और — खांसी, त्वचा पर दाने, या हाल ही में यात्रा?",
        chips_en: ["Also have cough / cold", "Joint pain / fatigue", "Recent travel / outside food", "Nothing else"],
        chips_hi: ["खांसी / जुकाम भी है", "जोड़ों में दर्द / कमजोरी", "हाल में यात्रा / बाहर का खाना", "और कुछ नहीं"],
      },
    ],
  },
  {
    id: "cough_cold",
    label: {
      en: "Cough & Cold",
      hi: "खांसी और जुकाम",
    },
    matchKeywords: {
      en: ["cough", "cold", "runny nose", "blocked nose", "sneezing", "congestion", "phlegm", "mucus"],
      hi: ["खांसी", "जुकाम", "नाक बंद", "छींक", "बलगम", "कफ", "नजला", "गले में कफ"],
    },
    redFlag: false,
    questions: [
      {
        id: "q1",
        field: "character_location",
        en: "Is the cough dry, or are you bringing up phlegm/mucus?",
        hi: "क्या खांसी सूखी है, या बलगम भी आता है?",
        chips_en: ["Dry cough", "With white / clear phlegm", "Thick yellow / green phlegm", "Continuous barking cough"],
        chips_hi: ["सूखी खांसी", "सफेद / पतला बलगम", "गाढ़ा पीला / हरा बलगम", "लगातार धसका उठना"],
      },
      {
        id: "q2",
        field: "trigger",
        en: "Do you also have a sore throat, blocked nose, or body ache?",
        hi: "क्या गले में खराश, नाक बंद होना, या बदन दर्द भी है?",
        chips_en: ["Sore throat & running nose", "Blocked nose & headache", "Mild body ache", "Only coughing"],
        chips_hi: ["गले में खराश और बहती नाक", "नाक बंद और सिरदर्द", "हल्का बदन दर्द", "केवल खांसी है"],
      },
      {
        id: "q3",
        field: "onset",
        en: "Since when have you had this cough or cold?",
        hi: "यह खांसी या जुकाम आपको कब से है?",
        chips_en: ["1-2 days", "3-5 days", "1-2 weeks", "More than 3 weeks"],
        chips_hi: ["1-2 दिनों से", "3-5 दिनों से", "1-2 हफ्ते से", "3 हफ्ते से ज्यादा"],
      },
      {
        id: "q4",
        field: "medication",
        en: "Have you taken any medicine for it?",
        hi: "क्या आपने इसके लिए कोई दवा ली है?",
        chips_en: ["Cough syrup", "Steam inhalation / ginger tea", "Allergy / Cold tablet", "No medicine yet"],
        chips_hi: ["कफ सिरप", "भाप ली / काढ़ा / अदरक चाय", "एंटी-एलर्जी टैबलेट", "कोई दवा नहीं ली"],
      },
      {
        id: "q5",
        field: "pattern",
        en: "Is this something that happens to you often, like with weather changes?",
        hi: "क्या यह आपको अक्सर होता है, जैसे मौसम बदलने पर?",
        chips_en: ["Seasonal / with weather changes", "Allergy tendency", "First time / unusual", "Rarely get cold"],
        chips_hi: ["मौसम बदलने पर अक्सर होता है", "एलर्जी की समस्या रहती है", "पहली बार हुआ है", "कम ही होता है"],
      },
      {
        id: "q6",
        field: "notes",
        en: "Anything else — fever, breathlessness, chest tightness?",
        hi: "कुछ और — बुखार, सांस फूलना, सीने में जकड़न?",
        chips_en: ["Mild fever", "Shortness of breath on exertion", "Chest congestion", "Nothing else"],
        chips_hi: ["हल्का बुखार", "चलने पर सांस फूलना", "सीने में जकड़न", "और कुछ नहीं"],
      },
    ],
  },
  {
    id: "back_pain",
    label: {
      en: "Back pain",
      hi: "कमर दर्द",
    },
    matchKeywords: {
      en: ["back pain", "backache", "spine", "lower back", "upper back", "lumbago", "sciatica"],
      hi: ["कमर दर्द", "पीठ दर्द", "रीढ़ की हड्डी", "कमर में दर्द", "पीठ में दर्द"],
    },
    redFlag: false,
    questions: [
      {
        id: "q1",
        field: "character_location",
        en: "Where exactly is the pain — upper back, lower back, or does it spread to the legs?",
        hi: "दर्द ठीक कहाँ है — पीठ के ऊपरी हिस्से में, कमर में, या पैरों तक फैलता है?",
        chips_en: ["Lower back (lumbar)", "Spreads down to legs / sciatica", "Upper back / between shoulders", "Entire spine"],
        chips_hi: ["निचली कमर में", "पैरों की तरफ फैलता है (सायटिका)", "ऊपरी पीठ / कंधों के बीच", "पूरी रीढ़ में"],
      },
      {
        id: "q2",
        field: "trigger",
        en: "Did it start after any specific activity, lifting, or injury?",
        hi: "क्या यह किसी खास काम, वजन उठाने, या चोट के बाद शुरू हुआ?",
        chips_en: ["Lifting heavy weight", "Long sitting / desk work", "Sudden jerk / twist", "No specific event / gradual"],
        chips_hi: ["भारी वजन उठाने से", "लगातार बैठे रहने से", "अचानक झटका लगने से", "धीरे-धीरे खुद शुरू हुआ"],
      },
      {
        id: "q3",
        field: "onset",
        en: "Since when have you had this back pain?",
        hi: "यह कमर दर्द आपको कब से है?",
        chips_en: ["Since today / yesterday", "A few days", "1-2 weeks", "Chronic for months"],
        chips_hi: ["आज / कल से", "कुछ दिनों से", "1-2 हफ्तों से", "कई महीनों से पुराना दर्द"],
      },
      {
        id: "q4",
        field: "medication",
        en: "Have you taken any medicine or done anything for relief?",
        hi: "क्या आपने आराम के लिए कोई दवा ली या कुछ किया?",
        chips_en: ["Pain spray / hot pack", "Painkiller tablet", "Rest in bed", "No treatment yet"],
        chips_hi: ["पेन स्प्रे / गर्म सिकाई", "दर्द की दवा ली", "बिस्तर पर आराम किया", "कुछ नहीं किया"],
      },
      {
        id: "q5",
        field: "pattern",
        en: "Is this a recurring problem for you?",
        hi: "क्या यह आपकी बार-बार होने वाली समस्या है?",
        chips_en: ["First time", "Recurring issue", "Worse in morning", "Worse after sitting/standing"],
        chips_hi: ["पहली बार", "बार-बार होता रहता है", "सुबह उठने पर ज्यादा", "बैठने/खड़े रहने पर बढ़ता है"],
      },
      {
        id: "q6",
        field: "notes",
        en: "Anything else — numbness, weakness in the legs, or difficulty walking?",
        hi: "कुछ और — सुन्नपन, पैरों में कमजोरी, या चलने में दिक्कत?",
        chips_en: ["Numbness / tingling in feet", "Difficulty walking / bending", "Stiffness in back", "Nothing else"],
        chips_hi: ["पैरों में सुन्नपन / झनझनाहट", "झुकने / चलने में परेशानी", "पीठ में अकड़न", "और कुछ नहीं"],
      },
    ],
  },
  {
    id: "joint_body_pain",
    label: {
      en: "Joint / Body pain",
      hi: "जोड़ों का दर्द / बदन दर्द",
    },
    matchKeywords: {
      en: ["joint pain", "body pain", "body ache", "knee pain", "arthritis", "shoulder pain", "leg pain", "elbow pain", "wrist pain"],
      hi: ["जोड़ों का दर्द", "बदन दर्द", "घुटने का दर्द", "जोड़", "घुटने", "संधिवात", "गठिया", "हाथ पैर दर्द"],
    },
    redFlag: false,
    questions: [
      {
        id: "q1",
        field: "character_location",
        en: "Which joints or parts of the body hurt?",
        hi: "कौन से जोड़ों या शरीर के किन हिस्सों में दर्द है?",
        chips_en: ["Both knees", "Shoulders / neck", "Multiple joints (hands & feet)", "Whole body ache"],
        chips_hi: ["दोनों घुटनों में", "कंधे / गर्दन", "हाथ-पैरों के कई जोड़ों में", "पूरे बदन में दर्द"],
      },
      {
        id: "q2",
        field: "trigger",
        en: "Is there any swelling, redness, or stiffness, especially in the morning?",
        hi: "क्या सूजन, लालिमा, या सुबह के समय अकड़न है?",
        chips_en: ["Morning stiffness (>30 mins)", "Visible swelling in joints", "Pain on climbing stairs", "No swelling"],
        chips_hi: ["सुबह उठते ही जोड़ों में अकड़न", "जोड़ों में सूजन है", "सीढ़ियां चढ़ने पर दर्द", "सूजन नहीं है"],
      },
      {
        id: "q3",
        field: "onset",
        en: "Since when have you had this pain?",
        hi: "यह दर्द आपको कब से है?",
        chips_en: ["A few days", "1-2 weeks", "Several months", "Years (chronic)"],
        chips_hi: ["कुछ दिनों से", "1-2 हफ्तों से", "कई महीनों से", "सालों से पुराना"],
      },
      {
        id: "q4",
        field: "medication",
        en: "Have you taken any medicine for it?",
        hi: "क्या आपने इसके लिए कोई दवा ली है?",
        chips_en: ["Ayurvedic oil / Lepa", "Pain relief tablets", "Calcium / Vitamin D", "No medicine yet"],
        chips_hi: ["आयुर्वेदिक तेल / मालिश", "दर्द की दवा ली", "कैल्शियम / विटामिन", "कोई दवा नहीं ली"],
      },
      {
        id: "q5",
        field: "pattern",
        en: "Does this come and go, or has it been constant?",
        hi: "क्या यह आता-जाता है, या लगातार बना रहता है?",
        chips_en: ["Constant ache", "Comes with walking / standing", "Worse in cold / damp weather", "Comes and goes"],
        chips_hi: ["लगातार दर्द रहता है", "चलने-फिरने पर बढ़ता है", "ठंड के मौसम में बढ़ जाता है", "आता-जाता रहता है"],
      },
      {
        id: "q6",
        field: "notes",
        en: "Anything else you'd like to mention?",
        hi: "कुछ और बताना चाहेंगे?",
        chips_en: ["Difficulty squatting", "Cracking sounds in joints", "Fatigue / low energy", "Nothing else"],
        chips_hi: ["उकड़ू बैठने में दिक्कत", "जोड़ों से कट-कट आवाज", "थकान और कमजोरी", "और कुछ नहीं"],
      },
    ],
  },
  {
    id: "diarrhea",
    label: {
      en: "Diarrhea / Loose motions",
      hi: "दस्त",
    },
    matchKeywords: {
      en: ["diarrhea", "loose motion", "loose stool", "watery stool", "motions", "dysentery", "stomach bug"],
      hi: ["दस्त", "पतला पखाना", "लूज मोशन", "पेचिश", "बार-बार शौच जाना"],
    },
    redFlag: false,
    questions: [
      {
        id: "q1",
        field: "character_location",
        en: "How many times a day are you passing loose motions?",
        hi: "आपको दिन में कितनी बार दस्त हो रहे हैं?",
        chips_en: ["3 to 4 times", "5 to 8 times", "More than 8 times (watery)", "Just started today"],
        chips_hi: ["दिन में 3-4 बार", "5 से 8 बार", "8 बार से ज्यादा (पानी जैसा)", "आज ही शुरू हुआ"],
      },
      {
        id: "q2",
        field: "trigger",
        en: "Did you eat anything unusual or outside food recently?",
        hi: "क्या आपने हाल ही में कुछ असामान्य या बाहर का खाना खाया?",
        chips_en: ["Outside / street food", "Stale / milk product", "Contaminated water", "Normal home food"],
        chips_hi: ["बाहर का / स्ट्रीट फूड", "बासी / दूध की चीजें", "बाहर का पानी", "घर का सादा खाना"],
      },
      {
        id: "q3",
        field: "onset",
        en: "Since when has this been happening?",
        hi: "यह कब से हो रहा है?",
        chips_en: ["Since early morning", "Since yesterday", "2-3 days", "Recurring on/off"],
        chips_hi: ["सुबह से", "कल से", "2-3 दिनों से", "अक्सर पेट खराब रहता है"],
      },
      {
        id: "q4",
        field: "medication",
        en: "Have you taken any medicine or ORS?",
        hi: "क्या आपने कोई दवा या ORS लिया है?",
        chips_en: ["Drinking ORS / Electral", "Antibiotic / Stool tablet", "Home remedies (buttermilk/curd)", "No medicine yet"],
        chips_hi: ["ORS / इलेक्ट्रॉल का घोल पी रहे हैं", "दस्त की दवा ली", "छाछ / दही / खिचड़ी", "कोई दवा नहीं ली"],
      },
      {
        id: "q5",
        field: "pattern",
        en: "Is there blood, mucus, or a lot of vomiting along with it?",
        hi: "क्या इसके साथ खून, बलगम, या बहुत उल्टी भी आ रही है?",
        chips_en: ["Only watery, no blood", "With stomach cramping", "With mucus / strain", "Mild nausea / vomiting"],
        chips_hi: ["सिर्फ पानी जैसा, खून नहीं", "पेट में मरोड़ के साथ", "आंव / बलगम आता है", "उल्टी / जी मिचलाना भी है"],
      },
      {
        id: "q6",
        field: "notes",
        en: "Anything else you'd like to tell the doctor?",
        hi: "डॉक्टर को कुछ और बताना चाहेंगे?",
        chips_en: ["Feeling dizzy / very weak", "Thirsty / dry mouth", "Mild fever", "Nothing else"],
        chips_hi: ["कमजोरी और चक्कर आ रहे हैं", "बहुत प्यास / मुंह सूखना", "हल्का बुखार", "और कुछ नहीं"],
      },
    ],
  },
  {
    id: "vomiting_nausea",
    label: {
      en: "Vomiting / Nausea",
      hi: "उल्टी / जी मिचलाना",
    },
    matchKeywords: {
      en: ["vomiting", "nausea", "throwing up", "puke", "gagging", "motion sickness"],
      hi: ["उल्टी", "जी मिचलाना", "मतली", "कै", "उबकाई आना"],
    },
    redFlag: false,
    questions: [
      {
        id: "q1",
        field: "character_location",
        en: "How many times have you vomited, and since when?",
        hi: "आपको कितनी बार उल्टी हुई है, और कब से?",
        chips_en: ["1-2 times today", "3-5 times", "Continuously throwing up", "Only nausea / feeling like vomiting"],
        chips_hi: ["आज 1-2 बार", "3 से 5 बार", "लगातार उल्टियां हो रही हैं", "सिर्फ जी मिचला रहा है, उल्टी नहीं हुई"],
      },
      {
        id: "q2",
        field: "trigger",
        en: "Does it happen after eating, or at any time?",
        hi: "क्या यह खाने के बाद होता है, या कभी भी?",
        chips_en: ["Immediately after eating/drinking", "Morning on empty stomach", "Constant urge", "After travel / movement"],
        chips_hi: ["खाने या पानी पीने के तुरंत बाद", "सुबह खाली पेट", "हर समय उबकाई आती है", "सफर के दौरान"],
      },
      {
        id: "q3",
        field: "onset",
        en: "Is it along with stomach pain, fever, or loose motions?",
        hi: "क्या इसके साथ पेट दर्द, बुखार, या दस्त भी है?",
        chips_en: ["With severe stomach cramps", "With loose motions / diarrhea", "With fever and headache", "Only vomiting"],
        chips_hi: ["पेट में तेज मरोड़ के साथ", "दस्त / लूज मोशन के साथ", "बुखार और सिरदर्द के साथ", "सिर्फ उल्टी है"],
      },
      {
        id: "q4",
        field: "medication",
        en: "Have you taken any medicine for it?",
        hi: "क्या आपने इसके लिए कोई दवा ली है?",
        chips_en: ["Antacid / Nausea tablet", "Ginger / Lemon water", "Injected / IV taken", "No medicine yet"],
        chips_hi: ["उल्टी रोकने की गोली ली", "अदरक / नींबू पानी", "कोई दवा नहीं ली"],
      },
      {
        id: "q5",
        field: "pattern",
        en: "Are you able to keep water or food down at all?",
        hi: "क्या आप पानी या खाना पेट में रोक पा रहे हैं?",
        chips_en: ["Can drink small sips of water", "Cannot keep even water down", "Can eat light food (khichdi)", "Not able to eat"],
        chips_hi: ["घूंट-घूंट पानी पी पा रहे हैं", "पानी भी नहीं रुक रहा", "हल्का खाना (खिचड़ी) खाया", "कुछ भी नहीं खा पा रहे"],
      },
      {
        id: "q6",
        field: "notes",
        en: "Anything else you'd like to mention?",
        hi: "कुछ और बताना चाहेंगे?",
        chips_en: ["Dry tongue / severe weakness", "Bitter taste / yellow fluid", "Nothing else"],
        chips_hi: ["मुंह सूख रहा है / बहुत कमजोरी", "कड़वा / पीला पानी निकला", "और कुछ नहीं"],
      },
    ],
  },
  {
    id: "skin_rash",
    label: {
      en: "Skin rash / Itching",
      hi: "त्वचा पर चकत्ते / खुजली",
    },
    matchKeywords: {
      en: ["rash", "itching", "skin allergy", "hives", "eczema", "boils", "red spots", "prickly heat"],
      hi: ["चकत्ते", "खुजली", "एलर्जी", "त्वचा", "लाल दाने", "फुंसी", "दाद", "खाज"],
    },
    redFlag: false,
    questions: [
      {
        id: "q1",
        field: "character_location",
        en: "Where on the body is the rash or itching?",
        hi: "शरीर पर कहाँ चकत्ते या खुजली है?",
        chips_en: ["Arms and legs", "Face and neck", "Chest / back", "All over the body", "Folds / private areas"],
        chips_hi: ["हाथ और पैरों पर", "चेहरे और गर्दन पर", "सीने / पीठ पर", "पूरे शरीर में", "जोड़ों की सिलवटों में"],
      },
      {
        id: "q2",
        field: "trigger",
        en: "Did you use any new soap, food, or medicine recently that might have triggered it?",
        hi: "क्या हाल ही में कोई नया साबुन, खाना, या दवा इस्तेमाल की जिससे यह शुरू हुआ हो?",
        chips_en: ["New medication / antibiotic", "New soap / cosmetic / cream", "Specific food (egg/seafood/nuts)", "Insect bite / plant contact", "Nothing specific"],
        chips_hi: ["नई दवा / एंटीबायोटिक ली थी", "नया साबुन / तेल / क्रीम", "कुछ खास खाना खाने से", "कीड़ा काटने / धूल से", "कुछ नया नहीं लिया"],
      },
      {
        id: "q3",
        field: "onset",
        en: "Since when have you had this?",
        hi: "यह आपको कब से है?",
        chips_en: ["Since today / sudden", "2-3 days", "1-2 weeks", "Chronic / on and off for months"],
        chips_hi: ["आज से ही / अचानक", "2-3 दिनों से", "1-2 हफ्ते से", "महीनों से बार-बार होता है"],
      },
      {
        id: "q4",
        field: "medication",
        en: "Have you applied or taken any medicine for it?",
        hi: "क्या आपने इसके लिए कोई दवा लगाई या ली है?",
        chips_en: ["Allergy tablet (Cetirizine)", "Cooling cream / Calamine", "Coconut oil / Neem", "No medicine yet"],
        chips_hi: ["एलर्जी की गोली (सिट्रीजीन)", "कैलामाइन / ठंडी क्रीम", "नारियल तेल / नीम लेप", "कुछ नहीं लगाया"],
      },
      {
        id: "q5",
        field: "pattern",
        en: "Does this happen to you often, like an allergy?",
        hi: "क्या यह आपको अक्सर होता है, जैसे कोई एलर्जी?",
        chips_en: ["Seasonal / often occurs", "First time ever", "Worse at night / with sweat", "Only when exposed to sun/dust"],
        chips_hi: ["अक्सर होता रहता है (एलर्जी)", "पहली बार हुआ है", "रात में / पसीने से खुजली बढ़ती है", "धूप या धूल से बढ़ता है"],
      },
      {
        id: "q6",
        field: "notes",
        en: "Anything else — swelling, fever, or difficulty breathing along with it?",
        hi: "कुछ और — सूजन, बुखार, या सांस लेने में दिक्कत भी?",
        chips_en: ["Mild swelling on face/lips", "Mild fever", "Burning sensation", "Nothing else"],
        chips_hi: ["चेहरे / होंठों पर हल्की सूजन", "हल्का बुखार", "जलन महसूस होती है", "और कुछ नहीं"],
      },
    ],
  },
  {
    id: "sore_throat",
    label: {
      en: "Sore throat",
      hi: "गले में खराश",
    },
    matchKeywords: {
      en: ["sore throat", "throat pain", "pain swallowing", "tonsils", "pharyngitis", "hoarseness", "lost voice"],
      hi: ["गले में खराश", "गला दर्द", "गले में दर्द", "निगलने में दर्द", "आवाज बैठना", "टॉन्सिल"],
    },
    redFlag: false,
    questions: [
      {
        id: "q1",
        field: "character_location",
        en: "Is it painful to swallow, and where exactly does it hurt?",
        hi: "क्या निगलने में दर्द होता है, और ठीक कहाँ दर्द होता है?",
        chips_en: ["Severe pain on swallowing", "Dry scratchy feeling", "Both sides of throat / tonsils", "Hoarse / raspy voice"],
        chips_hi: ["निगलने या थूक घूंटने में तेज दर्द", "सूखापन और खराश", "गले के दोनों तरफ / टॉन्सिल", "आवाज बैठ गई है"],
      },
      {
        id: "q2",
        field: "trigger",
        en: "Do you also have fever, cough, or a blocked nose?",
        hi: "क्या इसके साथ बुखार, खांसी, या नाक बंद होना भी है?",
        chips_en: ["With fever and chills", "With dry cough", "With cold / runny nose", "Only throat pain"],
        chips_hi: ["बुखार और ठंड के साथ", "सूखी खांसी के साथ", "जुकाम और नाक बहने के साथ", "सिर्फ गला दुख रहा है"],
      },
      {
        id: "q3",
        field: "onset",
        en: "Since when have you had this?",
        hi: "यह आपको कब से है?",
        chips_en: ["Since yesterday", "2-3 days", "About a week", "Recurring frequently"],
        chips_hi: ["कल से", "2-3 दिनों से", "लगभग एक हफ्ते से", "अक्सर गला खराब रहता है"],
      },
      {
        id: "q4",
        field: "medication",
        en: "Have you taken any medicine for it?",
        hi: "क्या आपने इसके लिए कोई दवा ली है?",
        chips_en: ["Salt water gargles", "Throat lozenges", "Antibiotic / painkiller", "Ginger honey tea", "Nothing yet"],
        chips_hi: ["नमक पानी के गरारे किए", "गले की गोली (Lozenges)", "काढ़ा / अदरक शहद", "कोई दवा नहीं ली"],
      },
      {
        id: "q5",
        field: "pattern",
        en: "Does this happen to you often?",
        hi: "क्या यह आपको अक्सर होता है?",
        chips_en: ["Frequently (cold drinks/ac)", "First time", "Seasonal / winter", "Rarely"],
        chips_hi: ["ठंडा पानी / AC से अक्सर होता है", "पहली बार", "सर्दियों में होता है", "कम ही होता है"],
      },
      {
        id: "q6",
        field: "notes",
        en: "Anything else you'd like to mention?",
        hi: "कुछ और बताना चाहेंगे?",
        chips_en: ["Swollen glands in neck", "Ear pain on same side", "Difficulty opening mouth", "Nothing else"],
        chips_hi: ["गर्दन में गिल्टी / सूजन", "कान में भी दर्द पहुंचता है", "मुंह खोलने में दर्द", "और कुछ नहीं"],
      },
    ],
  },
  {
    id: "dizziness_weakness",
    label: {
      en: "Dizziness / Weakness",
      hi: "चक्कर आना / कमजोरी",
    },
    matchKeywords: {
      en: ["dizziness", "weakness", "giddiness", "lightheaded", "fainting", "spinning", "vertigo", "fatigue", "tiredness"],
      hi: ["चक्कर", "कमजोरी", "थकान", "सिर घूमना", "बेहोशी", "कमज़ोरी", "सुस्ती"],
    },
    redFlag: false,
    questions: [
      {
        id: "q1",
        field: "character_location",
        en: "When do you feel dizzy or weak — standing up suddenly, all the time, or at specific moments?",
        hi: "आपको चक्कर या कमजोरी कब महसूस होती है — अचानक खड़े होने पर, हमेशा, या किसी खास समय पर?",
        chips_en: ["When standing up quickly", "Room spinning (vertigo)", "Constant body weakness / fatigue", "After skipping meals"],
        chips_hi: ["अचानक खड़े होने या चलने पर", "सिर घूमता है (चक्कर)", "हर समय कमजोरी / थकावट", "भूखे रहने पर"],
      },
      {
        id: "q2",
        field: "trigger",
        en: "Have you been eating and drinking normally?",
        hi: "क्या आप सामान्य रूप से खा-पी रहे हैं?",
        chips_en: ["Eating less than usual", "Low water intake / dehydration", "Regular meals", "Fasting currently"],
        chips_hi: ["भूख कम है / कम खा रहे हैं", "पानी कम पी रहे हैं", "नियमित खाना खा रहे हैं", "उपवास / व्रत रखा है"],
      },
      {
        id: "q3",
        field: "onset",
        en: "Since when have you been feeling this way?",
        hi: "यह आपको कब से महसूस हो रहा है?",
        chips_en: ["Started today", "Past 2-3 days", "More than a week", "Long-standing fatigue"],
        chips_hi: ["आज से शुरू हुआ", "पिछले 2-3 दिनों से", "एक हफ्ते से ज्यादा", "काफी समय से कमजोरी है"],
      },
      {
        id: "q4",
        field: "medication",
        en: "Have you taken any medicine, or noticed any other symptoms with it?",
        hi: "क्या आपने कोई दवा ली है या इसके साथ कोई और लक्षण देखा है?",
        chips_en: ["BP / Diabetes medicine taken", "Glucose / ORS taken", "Iron / Vitamin supplements", "No medicine taken"],
        chips_hi: ["BP / शुगर की दवा ली", "ग्लूकोज / ORS पिया", "खून / विटामिन की दवा", "कोई दवा नहीं ली"],
      },
      {
        id: "q5",
        field: "pattern",
        en: "Does this happen often, or is this new?",
        hi: "क्या यह अक्सर होता है, या यह नया है?",
        chips_en: ["New symptom / first time", "Occurs often on exertion", "History of low BP", "History of anemia"],
        chips_hi: ["पहली बार हुआ है", "मेहनत करने पर अक्सर होता है", "लो बीपी रहता है", "खून की कमी है"],
      },
      {
        id: "q6",
        field: "notes",
        en: "Anything else you'd like to tell the doctor?",
        hi: "डॉक्टर को कुछ और बताना चाहेंगे?",
        chips_en: ["Palpitations / fast heart beat", "Blackout / near fainting", "Cold sweat / trembling", "Nothing else"],
        chips_hi: ["दिल की धड़कन तेज होना", "आंखों के आगे अंधेरा छाना", "पसीना और घबराहट", "और कुछ नहीं"],
      },
    ],
  },
  {
    id: "chest_pain",
    label: {
      en: "Chest pain",
      hi: "सीने में दर्द",
    },
    matchKeywords: {
      en: ["chest pain", "chest pressure", "chest tightness", "heart pain", "angina", "chest heaviness"],
      hi: ["सीने में दर्द", "छाती में दर्द", "सीने में भारीपन", "सीने में दबाव", "दिल में दर्द", "छाती"],
    },
    redFlag: true,
    escalation_note:
      "Do NOT run the standard 6-question flow. Ask only the 3 questions below, then immediately alert staff/nurse and interrupt the normal intake sequence. Do not proceed to summary-and-next-step as with other complaints.",
    questions: [
      {
        id: "q1",
        field: "severity_now",
        en: "Is the pain in your chest right now, and how severe is it?",
        hi: "क्या अभी सीने में दर्द हो रहा है, और यह कितना तेज़ है?",
        chips_en: ["Severe pain right now", "Moderate pressure", "Mild discomfort", "Pain came and passed"],
        chips_hi: ["अभी बहुत तेज दर्द हो रहा है", "सीने में भारी दबाव", "हल्की बेचैनी", "दर्द आया था पर अब कम है"],
      },
      {
        id: "q2",
        field: "radiation_breathing",
        en: "Does the pain spread to your arm, jaw, or back, or are you having trouble breathing?",
        hi: "क्या दर्द बांह, जबड़े, या पीठ तक फैलता है, या सांस लेने में दिक्कत हो रही है?",
        chips_en: ["Spreads to left arm / jaw", "Spreads to back", "Difficulty breathing / sweating", "No radiation / breathing okay"],
        chips_hi: ["बाएं हाथ / जबड़े तक फैलता है", "पीठ की तरफ जाता है", "सांस फूल रही है / पसीना आ रहा है", "कहीं नहीं फैलता / सांस ठीक है"],
      },
      {
        id: "q3",
        field: "onset",
        en: "Since when has this been happening?",
        hi: "यह कब से हो रहा है?",
        chips_en: ["Started just minutes ago", "Past 1-2 hours", "Since earlier today", "On and off for days"],
        chips_hi: ["कुछ मिनट पहले ही शुरू हुआ", "1-2 घंटे से", "आज सुबह से", "कई दिनों से आता-जाता है"],
      },
    ],
  },
  {
    id: "general_other",
    label: {
      en: "Other / Unmatched complaint",
      hi: "अन्य समस्या",
    },
    matchKeywords: {
      en: [],
      hi: [],
    },
    redFlag: false,
    note: "Fallback when the patient's stated complaint doesn't match any category above.",
    questions: [
      {
        id: "q1",
        field: "character_location",
        en: "Can you describe what's bothering you?",
        hi: "आपको क्या तकलीफ हो रही है, कृपया बताएं?",
        chips_en: ["Discomfort in body", "Difficulty doing daily tasks", "Sleep issue", "General uneasiness"],
        chips_hi: ["शरीर में परेशानी", "रोजमर्रा के काम में दिक्कत", "नींद की समस्या", "बेचैनी महसूस होना"],
      },
      {
        id: "q2",
        field: "trigger",
        en: "Does anything make it better or worse?",
        hi: "क्या किसी चीज़ से यह ठीक होता है या बढ़ता है?",
        chips_en: ["Worse with exertion", "Better with rest", "Food makes a difference", "Nothing specific"],
        chips_hi: ["काम करने से बढ़ता है", "आराम करने से ठीक होता है", "खान-पान से फर्क पड़ता है", "कुछ खास नहीं"],
      },
      {
        id: "q3",
        field: "onset",
        en: "Since when have you had this problem?",
        hi: "यह समस्या आपको कब से है?",
        chips_en: ["Started today", "A few days ago", "1-2 weeks", "Long-standing"],
        chips_hi: ["आज से", "कुछ दिनों से", "1-2 हफ्ते से", "काफी समय से"],
      },
      {
        id: "q4",
        field: "medication",
        en: "Have you taken any medicine for it?",
        hi: "क्या आपने इसके लिए कोई दवा ली है?",
        chips_en: ["Took prescribed medicine", "Home remedy", "No medicine taken"],
        chips_hi: ["डॉक्टर की दवा ली", "घरेलू नुस्खा", "कोई दवा नहीं ली"],
      },
      {
        id: "q5",
        field: "pattern",
        en: "Does this happen often, or is this new?",
        hi: "क्या यह अक्सर होता है, या यह नया है?",
        chips_en: ["First time", "Happens repeatedly", "Comes and goes"],
        chips_hi: ["पहली बार", "बार-बार होता है", "आता-जाता रहता है"],
      },
      {
        id: "q6",
        field: "notes",
        en: "Anything else you'd like to mention?",
        hi: "कुछ और बताना चाहेंगे?",
        chips_en: ["Nothing else", "Want doctor's advice", "Need tests done"],
        chips_hi: ["और कुछ नहीं", "डॉक्टर से सलाह चाहिए", "जांच करानी है"],
      },
    ],
  },
];

/**
 * Matches user's chief complaint speech/text against the question bank.
 * E.g. "पेट में", "stomach pain", "बुखार है" -> matched complaint.
 */
export function matchChiefComplaint(userInput: string): ComplaintDefinition {
  const text = userInput.trim().toLowerCase();
  if (!text) return QUESTION_BANK.find((c) => c.id === "general_other")!;

  // 1. Check red flags first (e.g. chest pain)
  for (const c of QUESTION_BANK) {
    if (!c.redFlag) continue;
    const allKeywords = [...c.matchKeywords.en, ...c.matchKeywords.hi];
    for (const kw of allKeywords) {
      if (text.includes(kw.toLowerCase())) {
        return c;
      }
    }
  }

  // 2. Check standard specific complaints
  for (const c of QUESTION_BANK) {
    if (c.id === "general_other") continue;
    const allKeywords = [...c.matchKeywords.en, ...c.matchKeywords.hi];
    for (const kw of allKeywords) {
      if (text.includes(kw.toLowerCase())) {
        return c;
      }
    }
  }

  // Fallback
  return QUESTION_BANK.find((c) => c.id === "general_other")!;
}

/**
 * Generates a clean 2-3 sentence clinical summary for the doctor dashboard
 */
export function buildDoctorClinicalSummary(
  complaint: ComplaintDefinition,
  qaPairs: Array<{ question: string; answer: string; field: string }>
): string {
  const parts: string[] = [];
  parts.push(`Chief Complaint: ${complaint.label.en} (${complaint.label.hi})`);

  const answers = qaPairs
    .map((qa) => `• ${qa.question}: ${qa.answer}`)
    .join("\n");

  return `${parts[0]}\n\nReported Details:\n${answers}`;
}
