/* Caregiver Care Binder — intake data + assembler.
   Single source of truth for the web intake (index.html) and the Node
   end-to-end proof (proof/proof.js). Implements INTAKE.md: 87 questions,
   plus two build additions, flagged where they appear:
     + pronouns (Part 0) — the generator's schema needs it, or a binder
       for a father would print "her".
     + red-flags "watch" list (Part 3) — the binder's Red Flags page has
       a Watch column; the original intake never asked for its contents.
   Plus the Nov 27, 2026 comprehensiveness audit additions (17 questions,
   flagged in INTAKE.md): swallowing safety, the day at a glance,
   personal-care specifics, how they understand best, visitors, faith,
   language, the night, falls & transfers, medical history,
   home readings, driving, house systems, will/POLST locations, bills,
   final wishes & hospice, and the after-loss first calls.
   Plus one more build addition, flagged where it appears:
     + order_proof (Part 0, asked first) — the "harder lock" (Douglas,
       Nov 27, 2026): the questionnaire link is public, so the first
       question asks for the buyer's Etsy order number or the email on
       their payment receipt. One binder is built per order; a
       submission without it is not built. It rides at the top level of
       the assembled answers as `order_proof` (only when given, so the
       example-persona proof still matches byte for byte).
   Every question carries a one-line plain explanation of what to write
   and why it is asked (the Spell-It-Out standard, Douglas Nov 26 2026).
*/
"use strict";

const PARTS = [
  "Who this binder is for", "The first 10 minutes", "A day with your loved one",
  "Red flags", "Medications", "The care team", "Doctor visits",
  "Handing over care", "Hospital", "The house", "Paperwork — where things live",
  "If you are suddenly unavailable", "Their pet", "You, the caregiver",
];

const MED_FIELDS = [
  { key: "name", label: "Medicine name (from the bottle)" },
  { key: "strength", label: "Strength (from the bottle, e.g. 500 mg)" },
  { key: "purpose", label: "What it's for, in plain words" },
  { key: "when", label: "When it's taken" },
  { key: "how", label: "How it's taken (with food? whole? crushed?)" },
  { key: "prescriber", label: "Who prescribed it" },
];

const PRELOADS = {
  bring: [
    "This binder",
    "Insurance cards",
    "The pill organizer (or the medication list from it)",
    "A written list of anything new since last visit",
    "Any health logs you keep (blood sugar, sleep, symptoms)",
  ],
  bag_person: [
    "Nightgown or pajamas and a robe (their own)",
    "Glasses AND the spare pair",
    "Hearing aids + charger",
    "Toothbrush and their own toiletries",
    "This binder",
    "A phone charger",
  ],
};

/* type: text | textarea | choice-single | fields | list-text | list-obj |
   med-list | checklist | choice-detail | gate                        */
const QUESTIONS = [
  // ---------------------------------------------------------- Part 0
  // BUILD ADDITION (the lock, Nov 27, 2026): asked first, required.
  { id: "order_proof", part: 0, type: "text", required: true,
    q: "Your order number — or the email on your payment receipt",
    help: "If you bought on Etsy, type your Etsy order number — it is in your Etsy order confirmation. If you bought on our website, type the email address on your Stripe payment receipt. We build one binder per order, and this is how we know it is really your order. Your binder can't be built without it." },
  { id: "full_name", part: 0, type: "text",
    q: "What is your loved one's full name?",
    help: "Write the full legal name, like it appears on their insurance card. Doctors and hospitals use this name." },
  { id: "called_name", part: 0, type: "text",
    q: "What do people actually call them — the name they answer to?",
    help: "A nickname or short name, like “Maggie.” The binder uses this name everywhere, because helpers should use it too." },
  { id: "pronouns", part: 0, type: "choice-single", options: ["she/her", "he/him", "they/them"],
    q: "Which words should the binder use for them?",
    help: "Pick one. Every page of the binder will use these words, so the binder sounds right when someone reads it out loud." },
  { id: "dob", part: 0, type: "text",
    q: "Their date of birth?",
    help: "Month, day, year — for example, March 14, 1945. Paramedics and hospitals ask for this first." },
  { id: "caregiver", part: 0, type: "fields",
    fields: [{ key: "name", label: "Your full name" }, { key: "relationship", label: "How you are related (daughter, son, husband, wife, friend…)" }],
    q: "Your name, and how are you related to them?",
    help: "You are the person making this binder. Your name goes on the cover and the emergency page." },
  { id: "cg_phone", part: 0, type: "text",
    q: "Your phone number — the one that should ring first in an emergency?",
    help: "Write the number you actually answer, with the area code. It goes on the emergency page." },
  { id: "binder_home", part: 0, type: "text",
    q: "Where will this binder live in the house?",
    help: "Pick one exact spot and write it plainly, like “kitchen counter, in the blue basket by the phone.” This prints on the cover so anyone can find the binder again." },
  { id: "copies_to", part: 0, type: "list-text",
    q: "Who else should get a copy of this binder when it's made?",
    help: "Add one name per line — the people who would step in, or who live far away. As many as you like." },

  // ---------------------------------------------------------- Part 1
  { id: "conditions", part: 1, type: "list-text",
    q: "If a paramedic asked “what's wrong with them, in one breath,” what are their main health conditions?",
    help: "One condition per line, in plain words — “type 2 diabetes” is perfect. Write it the way you would say it." },
  { id: "allergies", part: 1, type: "list-obj",
    fields: [{ key: "item", label: "Allergic to" }, { key: "reaction", label: "What happens (e.g. breaks out in hives)" }],
    q: "What are they allergic to — medicines, foods, anything? What happens when they're exposed?",
    help: "One allergy per entry: what it is, and what happens. If there are no known allergies, add one entry that says “none known.”" },
  { id: "hospital", part: 1, type: "text",
    q: "What is their preferred hospital?",
    help: "The hospital you would tell an ambulance to go to. Write its full name." },
  { id: "call_first", part: 1, type: "list-obj",
    fields: [{ key: "name", label: "Name" }, { key: "phone", label: "Phone" }],
    q: "Who are the two people to call first, in order, with phone numbers?",
    help: "First person first. Name and phone for each. These print at the top of the emergency page." },
  { id: "never_do", part: 1, type: "textarea",
    q: "Is there anything a helper must NEVER do — a food, a medicine, a movement, a topic?",
    help: "The hard rules, written plainly: “Never leave them alone in the tub.” This prints in a red box on the emergency page." },
  { id: "aids", part: 1, type: "choice-detail",
    choices: ["Glasses", "Hearing aids", "Dentures", "Walker", "Cane", "Wheelchair"],
    q: "Do they wear or use any of these day to day? Where are the spares?",
    help: "Tap everything they use. Then write where things are kept and where the spares live — a helper cannot guess this." },

  // ---------------------------------------------------------- Part 2
  { id: "wake", part: 2, type: "textarea",
    q: "What time do they usually wake up, and what does a good morning look like, step by step?",
    help: "Walk through it in order: waking, bathroom, washing, dressing, first drink. Small details matter most here — they are what make a stranger's help feel familiar." },
  { id: "coffee", part: 2, type: "textarea",
    q: "How do they take their coffee or tea — exactly?",
    help: "Mug, sugar, milk, timing — exactly means exactly. This tiny detail is the one that makes a substitute feel like family instead of staff." },
  { id: "meals", part: 2, type: "textarea",
    q: "Walk me through meals: what do they eat, when, and what will they refuse?",
    help: "Breakfast, lunch, dinner, snacks, drinks — times and favorites, and the foods that will come back untouched." },
  { id: "swallow", part: 2, type: "textarea",
    q: "Eating and drinking safety: any trouble swallowing, coughing on drinks, food that must be cut small or soft, drinks that must be thickened, dentures in or out for meals?",
    help: "Only what is true for them. If eating is no trouble at all, write “no trouble.” A helper feeding them needs this before the first meal, not after a scare." },
  { id: "evening", part: 2, type: "textarea",
    q: "What does the evening look like — dinner to bedtime?",
    help: "Shows, routines, bath nights, visitors, the wind-down. Write it in the order it happens." },
  { id: "sleep", part: 2, type: "textarea",
    q: "What time do they go to bed, and what has to happen for them to sleep well?",
    help: "Lights on or off, water glass, doors, sounds. Whatever the ritual is, write every step — a substitute cannot invent it." },
  { id: "day_schedule", part: 2, type: "list-obj",
    fields: [{ key: "time", label: "Time (e.g. 6:30 a.m.)" }, { key: "what", label: "What happens" }],
    q: "The day at a glance: walk the clock — what time does each thing happen?",
    help: "One row per thing: wake-up, pills, breakfast, nap, lunch, the hard window, dinner, bath nights, bed. This prints as a one-page timetable a paid aide can run the day from." },
  { id: "help_level", part: 2, type: "textarea",
    q: "Tell me about bathing, dressing, and getting around the house: what can they do alone, what do they need a hand with, what must you do for them?",
    help: "Be honest and specific — tub, buttons, stairs, shelves. This page keeps a helper from helping too much, or too little." },
  { id: "personal_care", part: 2, type: "textarea",
    q: "Bathing, dressing, and the bathroom, in detail: bath or shower — how often, what help, what order? Dressing — what goes on first, what they pick themselves? The bathroom — do they go alone, on a schedule, at night? Any pads, briefs, or supplies, and where are they kept?",
    help: "The specifics a helper cannot guess and should never have to ask about in the moment. Write it plainly — dignity lives in the details being handled without a fuss." },
  { id: "favorite", part: 2, type: "text",
    q: "What's their favorite show, music, or pastime — the one that reliably settles them?",
    help: "One line is fine. This is the helper's best tool on a hard afternoon." },
  { id: "calms", part: 2, type: "textarea",
    q: "What calms them when they're upset or anxious? What actually works?",
    help: "Only what truly works, in the order you try it. This knowledge lives in your head right now — the binder needs it." },
  { id: "upsets", part: 2, type: "textarea",
    q: "What upsets them, frightens them, or sets them off — that a stranger wouldn't guess?",
    help: "Noises, topics, being rushed, surprise visitors — whatever you learned the hard way, so the next person doesn't have to." },
  { id: "bad_day_signs", part: 2, type: "textarea",
    q: "What does a BAD day look like with them — how can someone tell early?",
    help: "The first small signs, before it becomes a hard day. Early is when help works best." },
  { id: "bad_day_help", part: 2, type: "textarea",
    q: "When a bad day starts, what helps, in what order?",
    help: "Step one, step two, step three — and when to stop trying and call you. Write it like instructions, because that is what it is." },
  { id: "hard_time", part: 2, type: "textarea",
    q: "Is there a time of day that's harder — late afternoon, sundown, nights? What happens and what do you do?",
    help: "If there is a hard window, name the hours and what happens in them, and exactly what you do about it." },
  { id: "loves_talking", part: 2, type: "textarea",
    q: "What do they love talking about? What stories do they tell?",
    help: "The safe, happy topics. A helper who can start these conversations can get through almost any afternoon." },
  { id: "avoid_topics", part: 2, type: "text",
    q: "Are there words, names, or subjects to avoid?",
    help: "The sore subjects. One line is fine — this prints as a clear warning on the day page." },
  { id: "signals", part: 2, type: "textarea",
    q: "How do they let you know they need the bathroom, are in pain, or are hungry — especially if words are hard for them?",
    help: "The signs you read without thinking: a look, a movement, a repeated question. Write each need and its sign." },
  { id: "communicates", part: 2, type: "textarea",
    q: "How do they understand best — short sentences, one thing at a time, written words, pictures? What words or phrases do YOU use that work?",
    help: "Your exact way of saying things: the phrases that land, the ones that don't. A helper who talks to them the way you do gets a calmer person." },
  { id: "visitors", part: 2, type: "textarea",
    q: "Visitors: who is welcome, and when? Who should NOT visit — or only when family is home? Any visiting rules (call first, not at certain hours)?",
    help: "Name the welcome ones and the hard ones, plainly. This page stops a well-meaning visit from landing at the worst hour of the day." },
  { id: "faith", part: 2, type: "textarea",
    q: "Their faith: church or faith tradition, practices that matter (prayer, grace, services, a clergy visit), and who from the church stays in touch?",
    help: "Only what matters to them. If faith is a big part of who they are, a helper should know how to keep it in the day — and who to call from the church." },
  { id: "language", part: 2, type: "text",
    q: "Languages and roots: what languages do they speak or understand? Words from another language they still use? Where are they from, and what customs or foods from their upbringing matter?",
    help: "One or two lines. People often reach for their first language when they are tired or confused — a helper who knows that won't be frightened by it." },
  { id: "night_waking", part: 2, type: "textarea",
    q: "If they wake in the night — confused, needing the bathroom, calling out, trying to get up — what do you do, step by step?",
    help: "Your exact steps, in order: what you say, what you check, how you settle them back down. This prints on the Night page — the one a sitter reads at 2 a.m." },
  { id: "falls_transfers", part: 2, type: "textarea",
    q: "Falls and moving: have they fallen in the last year — how often, and were they hurt? And how do you help them stand, or move from bed to chair — your exact way?",
    help: "Be exact: where you stand, what they hold, what never to pull on. Falls and transfers are where helpers get hurt and loved ones get dropped — your way, written down, prevents both." },

  // ---------------------------------------------------------- Part 3
  { id: "rf_doctor", part: 3, type: "list-text",
    q: "Has their doctor ever said “call me right away if you see ___”? What were the exact things?",
    help: "One thing per line, in the doctor's words as best you remember them. We print only what the doctor said — we never add our own." },
  { id: "rf_911", part: 3, type: "list-text",
    q: "What would make YOU call 911 without hesitating?",
    help: "Your list, from your knowledge of this person. One thing per line." },
  { id: "rf_normal", part: 3, type: "textarea",
    q: "What changes are normal-for-them that a stranger might panic about?",
    help: "Their everyday quirks that look alarming but aren't. This page stops false alarms — that is half its value." },
  { id: "rf_watch", part: 3, type: "list-text",
    q: "What changes are worth watching and writing down, even when they're not emergencies?",
    help: "The small things: more naps, eating less, a bruise with no story. One per line. Helpers will note these in the log." },
  { id: "rf_fall", part: 3, type: "textarea",
    q: "After a fall: what has their doctor told you to do?",
    help: "Write the doctor's instruction as it was given to you — when to help them up, and when to call 911 instead." },
  { id: "rf_fever", part: 3, type: "text",
    q: "Do they have a fever rule — a temperature where you call? What is it?",
    help: "For example: “Call the doctor at 100.4°F or higher.” If the doctor never gave one, write “no rule given.”" },

  // ---------------------------------------------------------- Part 4
  { id: "meds", part: 4, type: "med-list",
    q: "List each medication they take every day.",
    help: "Copy the name and strength from the bottle label. Then, in plain words: what it's for, when it's taken, how it's taken, and who prescribed it. One medicine per entry. We print your words exactly — we never change a dose." },
  { id: "supplements", part: 4, type: "med-list",
    q: "Any vitamins, supplements, or over-the-counter things they take regularly?",
    help: "Same form as the medicines — they count. Doctors and hospitals need the whole list, not just the prescriptions." },
  { id: "asneeded", part: 4, type: "med-list",
    q: "Any “as-needed” medicines?",
    help: "For what, how much, and how often at most — exactly as written on the label or the doctor's instruction." },
  { id: "med_where", part: 4, type: "textarea",
    q: "Where are the medicines kept? Is there a pill organizer — who fills it, and when?",
    help: "Exact places: the organizer, the original bottles, the cabinet. A helper at 2 a.m. needs this spelled out." },
  { id: "pharmacy", part: 4, type: "text",
    q: "Which pharmacy fills them? Name, phone, address.",
    help: "One line: name, phone, street address — plus anything special, like free delivery." },
  { id: "med_trick", part: 4, type: "textarea",
    q: "Any medicine they refuse, spit out, or struggle with — and your trick for it?",
    help: "Your hard-won trick, written down. This one answer can save a substitute a very bad morning." },

  // ---------------------------------------------------------- Part 5
  { id: "team_primary", part: 5, type: "fields",
    fields: [{ key: "name", label: "Doctor's name" }, { key: "org", label: "Clinic and address" },
             { key: "phone", label: "Phone" }, { key: "notes", label: "How often they're seen" }],
    fixedRole: "Primary care",
    q: "Primary care doctor: name, clinic, phone, address.",
    help: "The main doctor. In the last box, write how often they're seen — “every 3 months.”" },
  { id: "team_specialists", part: 5, type: "list-obj",
    fields: [{ key: "role", label: "What they're for (e.g. Neurologist (memory))" }, { key: "name", label: "Name" },
             { key: "org", label: "Clinic and address" }, { key: "phone", label: "Phone" },
             { key: "notes", label: "How often they're seen" }],
    q: "Each specialist: what they're for, name, phone, how often they're seen.",
    help: "One specialist per entry. “What they're for” becomes the label in the binder." },
  { id: "team_other", part: 5, type: "list-obj",
    fields: [{ key: "role", label: "Kind (Dentist / Eye doctor / Hearing / Other)" }, { key: "name", label: "Name" },
             { key: "org", label: "Clinic and address" }, { key: "phone", label: "Phone" },
             { key: "notes", label: "Notes (e.g. new glasses March 2026)" }],
    q: "Dentist, eye doctor, hearing — who and where?",
    help: "One per entry: the kind, then name, clinic, and phone." },
  { id: "team_aides", part: 5, type: "list-obj",
    fields: [{ key: "role", label: "Their job (e.g. Home health aide)" }, { key: "name", label: "Name" },
             { key: "org", label: "Agency and agency phone" }, { key: "phone", label: "Their phone" },
             { key: "notes", label: "Schedule (e.g. Tue & Thu mornings, 9–12)" }],
    q: "Home health aide, therapist, or agency involved? Name, agency phone, schedule.",
    help: "One helper per entry. If nobody helps yet, leave this empty — you can skip it." },
  { id: "med_history", part: 5, type: "textarea",
    q: "Their medical history, the short version: past surgeries, hospital stays, and big diagnoses over the years — what, and roughly when?",
    help: "A few lines is plenty: “Appendix out, 1978. Hospital for pneumonia, 2019.” New doctors and hospital staff always ask — this page answers without you in the room." },
  { id: "insurance_main", part: 5, type: "fields",
    fields: [{ key: "plan", label: "Plan name" }, { key: "last4", label: "Member ID — LAST 4 DIGITS ONLY", last4: true }],
    q: "Their main health insurance: plan name and member ID — last 4 digits ONLY.",
    help: "Never type the full number — the binder never holds it, on purpose. Just the plan name and the last 4 digits." },
  { id: "insurance_more", part: 5, type: "list-obj",
    fields: [{ key: "plan", label: "Plan name" }, { key: "last4", label: "Member ID — LAST 4 DIGITS ONLY", last4: true }],
    q: "Medicare, Medicaid, or supplemental plans — same last-4 rule.",
    help: "One plan per entry: plan name, last 4 digits only." },

  // ---------------------------------------------------------- Part 6
  { id: "bring", part: 6, type: "checklist", preload: "bring",
    q: "What do you always bring to appointments?",
    help: "We started the list with the standard items — they are already ticked. Untick what you don't bring, and add your own at the bottom." },
  { id: "standing_q", part: 6, type: "list-text",
    q: "What are the standing questions you ask at every visit?",
    help: "The questions you never want to forget in the room. One per line." },
  { id: "next_visit", part: 6, type: "textarea",
    q: "Is there something you're watching that the doctor should hear about at the NEXT visit?",
    help: "Write it now, while you're thinking of it. It prints on the visit page so it can't be forgotten." },
  { id: "readings", part: 6, type: "text",
    q: "Do you take any readings at home — blood sugar, blood pressure, weight, temperature, oxygen? What, and how often?",
    help: "One line, like “Blood sugar morning and evening; weight Friday mornings.” The binder carries a log page for these — this line tells helpers what belongs in it. If you take none, write “none.”" },
  { id: "tells_after", part: 6, type: "text",
    q: "Who in the family gets told after a visit, and who does the telling?",
    help: "One line: who hears, who tells them, and how — text, call, group chat." },
  { id: "family", part: 6, type: "list-obj",
    fields: [{ key: "name", label: "Name" }, { key: "who", label: "Who they are (son, neighbor 30 years…)" },
             { key: "does", label: "What they actually do" }],
    q: "Who else helps with care — siblings, neighbors, church, friends? What does each person do?",
    help: "One person per entry: name, who they are, and what they actually do. In the Family Edition, the first three people here also get their own printed card sets." },

  // ---------------------------------------------------------- Part 7
  { id: "trusted", part: 7, type: "text",
    q: "If you got a full day off tomorrow, who would you trust to stay?",
    help: "The name — and for how long they're proven: a day, a weekend." },
  { id: "must_go_right", part: 7, type: "list-text",
    q: "What are the three things that MUST go right while you're gone?",
    help: "Exactly three if you can. These print at the top of the handoff checklist, in your words." },
  { id: "show_items", part: 7, type: "list-text",
    q: "Show-me items: what would you physically walk a sitter through in the house before leaving?",
    help: "The med box, the locks, the thermostat, their chair — one per line. If it has to be touched to be understood, it goes here." },
  { id: "call_rules", part: 7, type: "textarea",
    q: "When should a sitter call you — and when should they NOT worry about bothering you?",
    help: "Spell out both sides. Sitters guess wrong in both directions — this page ends the guessing." },
  { id: "check_in", part: 7, type: "text",
    q: "What time will you check in, and how — call, text?",
    help: "One line: “I text at noon and call at 8.” The sitter plans around it." },

  // ---------------------------------------------------------- Part 8
  { id: "bag_person", part: 8, type: "checklist", preload: "bag_person",
    q: "What goes in the hospital bag for them?",
    help: "Our standard list is started for you and already ticked — untick what doesn't fit, and add the personal things only you know about." },
  { id: "bag_caregiver", part: 8, type: "list-text",
    q: "What goes in YOUR bag as the caregiver?",
    help: "Charger, clothes, your own medicines, snacks, a notebook. Nobody asks the caregiver this — hospital days are long." },
  { id: "hospital_call", part: 8, type: "text",
    q: "Who should the hospital call besides you?",
    help: "Name and phone. This prints on the hospital page." },
  { id: "first_nights", part: 8, type: "text",
    q: "After any hospital stay, who helps the first two nights home?",
    help: "Names. The first nights home are the hardest — this is planned now, not improvised later." },

  // ---------------------------------------------------------- Part 9
  { id: "hazards", part: 9, type: "textarea",
    q: "Any trip hazards, tricky stairs, or rooms that are a problem?",
    help: "Walk the house in your mind, room by room. Name the exact spot — “front step, no rail.”" },
  { id: "bathroom", part: 9, type: "choice-detail",
    choices: ["Grab bars", "Shower chair", "Raised toilet seat", "Non-slip mat", "Handheld shower head"],
    q: "Bathroom: grab bars, shower chair, raised seat — what's there, what's missing?",
    help: "Tap what's installed. Then write what's missing or tricky — a helper needs to know before bath time, not during." },
  { id: "night", part: 9, type: "choice-detail",
    choices: ["Night lights", "Clear path to the bathroom", "Phone by the bed", "Alert button"],
    q: "Night: are there night lights, a clear path to the bathroom, a phone or alert button by the bed?",
    help: "Tap what's true tonight. Then add anything else about the night — doors, sounds, wandering." },
  { id: "kitchen", part: 9, type: "textarea",
    q: "Kitchen: stove habits, automatic shutoff, anything they shouldn't use alone?",
    help: "What they can safely use, what they can't, and where the dangerous things live." },
  { id: "doors", part: 9, type: "textarea",
    q: "Doors, locks, wandering: anything a helper must know about the doors at night?",
    help: "Which doors lock, which stick, who has tried what. Write it plainly — the night helper will thank you." },
  { id: "supplies", part: 9, type: "text",
    q: "Where are the flashlights, first-aid kit, and extra batteries?",
    help: "Exact spots. In the dark, “the drawer” is not an answer — say which drawer." },
  { id: "driving", part: 9, type: "text",
    q: "Driving: do they still drive? If not, where are the keys, and what do you say when they ask to drive?",
    help: "One or two lines. A helper needs to know before the question comes up — and your words for it, so it doesn't become an argument." },
  { id: "house_systems", part: 9, type: "textarea",
    q: "How the house works: alarm system (is there one, and where are its instructions kept — never the code itself)? Thermostat? Breaker box? Water shut-off? Any appliance with a trick to it?",
    help: "Places and how-tos only — never a code or combination. The things you would have to show a house-sitter in the first five minutes." },

  // ---------------------------------------------------------- Part 10
  { id: "pw_cards", part: 10, type: "text",
    q: "Where are their insurance cards kept?",
    help: "The exact place — “their purse, front pocket.” This whole part is locations only: never numbers, never the documents themselves." },
  { id: "pw_id", part: 10, type: "text",
    q: "Where is their photo ID kept?",
    help: "Exact place, one line." },
  { id: "pw_directive", part: 10, type: "textarea",
    q: "Do they have a healthcare power of attorney / advance directive? Where does the signed copy live, and who else holds a copy?",
    help: "Locations and names only. We will never ask you to upload, copy, or type the document itself — the binder only records where it lives." },
  { id: "pw_legal2", part: 10, type: "text",
    q: "Their will, and any POLST or DNR form: where do the signed copies live, and who else holds one?",
    help: "Locations and names only — never the documents themselves. If they have neither, write “none.”" },
  { id: "pw_deed", part: 10, type: "text",
    q: "Where are the house deed, car title, and insurance policies kept?",
    help: "The box, the drawer, the safe deposit box — where, in one line." },
  { id: "pw_safe", part: 10, type: "text",
    q: "Is there a safe or lockbox? Who knows where the key or combination is (not the combination itself)?",
    help: "Never write the combination. Only who knows where to find it." },
  { id: "pw_lawyer", part: 10, type: "text",
    q: "Who is their lawyer, if any? Name and phone.",
    help: "If there is no lawyer, write “none.”" },
  { id: "pw_banks", part: 10, type: "text",
    q: "Bank and account locations — bank names only, never account numbers.",
    help: "Bank names only. This page exists so the family can find things on the worst day, not the best one." },
  { id: "pw_bills", part: 10, type: "text",
    q: "Who handles their money and bills day to day? Where do the bills and statements live?",
    help: "A name and a place: “I do; the bill box is in the spare-room desk.” Names and places only — never an account number." },
  { id: "pw_final", part: 10, type: "text",
    q: "Final wishes: is there a letter or document where they wrote what they want at the end — and where does it live? If hospice ever becomes part of care, is there an agency the family would call first?",
    help: "Locations and names only — the wishes themselves stay in their own document. If there is no letter and no agency picked, write “not decided yet” — that is an honest, useful answer." },
  { id: "after_loss", part: 10, type: "textarea",
    q: "If the worst day comes: after the emergency call, who gets called, in what order? Funeral home name and phone? Clergy? The family list?",
    help: "Hard to write, harder to improvise. Names and phone numbers in call order. On that day, nobody should have to search for any of this." },

  // ---------------------------------------------------------- Part 11
  { id: "bk_first", part: 11, type: "text",
    q: "If you were in the hospital tonight, who is the FIRST person to call?",
    help: "Name and phone. This is the page nobody else's binder has — the plan for the day YOU are the emergency." },
  { id: "bk_second", part: 11, type: "text",
    q: "Who is second, if the first can't be reached?",
    help: "Name and phone." },
  { id: "bk_stay", part: 11, type: "fields",
    fields: [{ key: "first_night", label: "Who can stay the first night" }, { key: "first_week", label: "Who can take over for a week" }],
    q: "Who can stay the first night? Who can take over for a week?",
    help: "Two answers: the first-night person, and the whole-week person. They are usually different people." },
  { id: "bk_keys", part: 11, type: "text",
    q: "Who has a house key? Who knows where the alarm code is written down?",
    help: "Names only — never the code itself." },
  { id: "bk_unknown", part: 11, type: "textarea",
    q: "What would a backup caregiver NOT know that would hurt them in the first 24 hours?",
    help: "The traps: the hard time of day, the hidden pill, the one rule. Write it like a warning to a friend — because it is one." },
  { id: "bk_owninfo", part: 11, type: "text",
    q: "Where is YOUR own emergency information — your doctor, your medicines, your insurance card?",
    help: "If you are the patient, the backup needs to find YOUR information too. Say where it lives." },

  // ---------------------------------------------------------- Part 12
  { id: "has_pet", part: 12, type: "gate",
    q: "Do they have a pet?",
    help: "If yes, the binder gets a pet page — sitters forget pets, and pets can't speak for themselves. If no, we skip this part." },
  { id: "pet_basics", part: 12, type: "fields", petOnly: true,
    fields: [{ key: "name", label: "Pet's name" }, { key: "kind", label: "Kind and age (e.g. beagle mix, 9 years old)" },
             { key: "vet", label: "Vet name, clinic, and phone" }],
    q: "Pet's name, kind, age? Vet name and phone?",
    help: "Three short answers: the pet, what it is, and the vet with phone." },
  { id: "pet_food", part: 12, type: "text", petOnly: true,
    q: "What do they eat, how much, when? Where is the food kept?",
    help: "Amounts and times, and where the food bin lives. A sitter will not guess portions." },
  { id: "pet_notes", part: 12, type: "textarea", petOnly: true,
    q: "Any medicines, quirks, fears, or rules (doors, yard, other animals)?",
    help: "Thunder fears, escape habits, the pill hidden in peanut butter — the pet's version of the never-do list." },
  { id: "pet_week", part: 12, type: "text", petOnly: true,
    q: "If nobody in the family could keep the pet for a week, who would?",
    help: "A name. Planned now beats a scramble later." },

  // ---------------------------------------------------------- Part 13
  { id: "cg_break", part: 13, type: "textarea",
    q: "What does a real break look like for you — and when did you last get one?",
    help: "Be specific: a day, a weekend, a morning. If the honest answer is “I don't remember,” write that — this page is allowed to tell the truth." },
  { id: "cg_onehour", part: 13, type: "text",
    q: "Who could give you one hour this week if you asked?",
    help: "A name. The asking is the hard part — the binder asks for you." },
  { id: "cg_warning", part: 13, type: "list-text",
    q: "What are YOUR warning signs that you're running on empty?",
    help: "One per line — the signs someone who loves you could spot. They print on your page so they can act on them." },
  { id: "cg_doctor", part: 13, type: "text",
    q: "Your own doctor's name and phone? Your medicines, in brief?",
    help: "One or two lines. Your page of the binder carries your information too." },
  { id: "anything_else", part: 13, type: "textarea",
    q: "Anything else — anything at all — that the next person holding this binder should know?",
    help: "The catch-all. The person, not the diagnosis: who they are, what they love, what makes them them. End the binder with the human being." },
];

function sanitizeLast4(v) {
  const digits = String(v == null ? "" : v).replace(/\D/g, "").slice(-4);
  return digits ? "…" + digits : "";
}

function str(raw, id) { const v = raw[id]; return typeof v === "string" ? v : ""; }
function arr(raw, id) { const v = raw[id]; return Array.isArray(v) ? v : []; }
function obj(raw, id) { const v = raw[id]; return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }

function choiceDetail(raw, id) {
  const v = obj(raw, id);
  const segs = [];
  if (Array.isArray(v.choices) && v.choices.length) segs.push(v.choices.join(", "));
  if (v.detail) segs.push(v.detail);
  return segs.join(". ");
}

function cleanObjList(list, fields) {
  return (Array.isArray(list) ? list : []).map((e) => {
    const out = {};
    fields.forEach((f) => { out[f] = e && e[f] ? String(e[f]) : ""; });
    return out;
  }).filter((e) => fields.some((f) => e[f] !== ""));
}

function assembleAnswers(raw) {
  raw = raw || {};
  const primary = obj(raw, "team_primary");
  const team = [];
  if (primary.name) team.push({ role: "Primary care", name: primary.name || "", org: primary.org || "",
                                phone: primary.phone || "", notes: primary.notes || "" });
  cleanObjList(raw.team_specialists, ["role", "name", "org", "phone", "notes"]).forEach((e) => team.push(e));
  cleanObjList(raw.team_other, ["role", "name", "org", "phone", "notes"]).forEach((e) => team.push(e));
  cleanObjList(raw.team_aides, ["role", "name", "org", "phone", "notes"]).forEach((e) => team.push(e));

  const insMain = obj(raw, "insurance_main");
  const insurance = [];
  if (insMain.plan) insurance.push({ plan: insMain.plan, last4: sanitizeLast4(insMain.last4) });
  cleanObjList(raw.insurance_more, ["plan", "last4"]).forEach((e) =>
    insurance.push({ plan: e.plan, last4: sanitizeLast4(e.last4) }));

  const medFields = MED_FIELDS.map((f) => f.key);
  const medications = [];
  ["meds", "supplements", "asneeded"].forEach((id) =>
    cleanObjList(raw[id], medFields).forEach((m) => medications.push(m)));

  const bkStay = obj(raw, "bk_stay");
  const cg = obj(raw, "caregiver");
  const petB = obj(raw, "pet_basics");

  const answers = {
    loved_one: {
      full_name: str(raw, "full_name"), called_name: str(raw, "called_name"),
      date_of_birth: str(raw, "dob"), pronouns: str(raw, "pronouns") || "she/her",
    },
    caregiver: { name: cg.name || "", relationship: cg.relationship || "", phone: str(raw, "cg_phone") },
    binder_home: str(raw, "binder_home"),
    copies_to: arr(raw, "copies_to").slice(),
    conditions: arr(raw, "conditions").slice(),
    allergies: cleanObjList(raw.allergies, ["item", "reaction"]),
    preferred_hospital: str(raw, "hospital"),
    call_first: cleanObjList(raw.call_first, ["name", "phone"]),
    never_do: str(raw, "never_do"),
    aids: choiceDetail(raw, "aids"),
    day: {
      wake: str(raw, "wake"), coffee: str(raw, "coffee"), meals: str(raw, "meals"),
      evening: str(raw, "evening"), sleep: str(raw, "sleep"), help_level: str(raw, "help_level"),
    },
    favorite_show: str(raw, "favorite"),
    calms: str(raw, "calms"), upsets: str(raw, "upsets"), avoid_topics: str(raw, "avoid_topics"),
    bad_day_signs: str(raw, "bad_day_signs"), bad_day_help: str(raw, "bad_day_help"),
    hard_time: str(raw, "hard_time"), loves_talking: str(raw, "loves_talking"),
    signals: str(raw, "signals"),
    day_schedule: cleanObjList(raw.day_schedule, ["time", "what"]),
    swallow: str(raw, "swallow"), personal_care: str(raw, "personal_care"),
    communicates: str(raw, "communicates"), visitors: str(raw, "visitors"),
    faith: str(raw, "faith"), language: str(raw, "language"),
    night_waking: str(raw, "night_waking"), falls_transfers: str(raw, "falls_transfers"),
    med_history: str(raw, "med_history"), readings_home: str(raw, "readings"),
    driving: str(raw, "driving"), after_loss: str(raw, "after_loss"),
    red_flags: {
      call_911: arr(raw, "rf_911").slice(), call_doctor: arr(raw, "rf_doctor").slice(),
      watch: arr(raw, "rf_watch").slice(), after_fall: str(raw, "rf_fall"),
      fever_rule: str(raw, "rf_fever"), normal_for_her: str(raw, "rf_normal"),
    },
    medications,
    med_notes: [str(raw, "med_where"), str(raw, "med_trick")].filter(Boolean).join(" "),
    pharmacy: str(raw, "pharmacy"),
    care_team: team,
    insurance,
    visit: {
      bring: arr(raw, "bring").slice(), standing_questions: arr(raw, "standing_q").slice(),
      next_visit_note: str(raw, "next_visit"),
    },
    tells_after_visit: str(raw, "tells_after"),
    family: cleanObjList(raw.family, ["name", "who", "does"]),
    handoff: {
      trusted: str(raw, "trusted"), must_go_right: arr(raw, "must_go_right").slice(),
      show_items: arr(raw, "show_items").slice(), call_rules: str(raw, "call_rules"),
      check_in: str(raw, "check_in"),
    },
    hospital: {
      bag_person: arr(raw, "bag_person").slice(), bag_caregiver: arr(raw, "bag_caregiver").slice(),
      hospital_call_besides: str(raw, "hospital_call"), first_nights_help: str(raw, "first_nights"),
    },
    house: {
      hazards: str(raw, "hazards"), bathroom: choiceDetail(raw, "bathroom"),
      night: choiceDetail(raw, "night"), kitchen: str(raw, "kitchen"),
      doors: str(raw, "doors"), supplies: str(raw, "supplies"),
      house_systems: str(raw, "house_systems"),
    },
    paperwork: {
      insurance_cards: str(raw, "pw_cards"), photo_id: str(raw, "pw_id"),
      directive: str(raw, "pw_directive"), deed_titles: str(raw, "pw_deed"),
      safe: str(raw, "pw_safe"), lawyer: str(raw, "pw_lawyer"), banks: str(raw, "pw_banks"),
      will_polst: str(raw, "pw_legal2"), bills: str(raw, "pw_bills"),
      final_wishes: str(raw, "pw_final"),
    },
    backup: {
      first_call: str(raw, "bk_first"), second_call: str(raw, "bk_second"),
      first_night: bkStay.first_night || "", first_week: bkStay.first_week || "",
      keys: str(raw, "bk_keys"), wouldnt_know: str(raw, "bk_unknown"),
      caregiver_own_info: str(raw, "bk_owninfo"),
    },
    caregiver_page: {
      break_looks_like: str(raw, "cg_break"), one_hour: str(raw, "cg_onehour"),
      warning_signs: arr(raw, "cg_warning").slice(), own_doctor: str(raw, "cg_doctor"),
    },
    anything_else: str(raw, "anything_else"),
  };
  if (raw.has_pet) {
    answers.pet = {
      name: petB.name || "", kind: petB.kind || "", vet: petB.vet || "",
      food: str(raw, "pet_food"), notes: str(raw, "pet_notes"), week_care: str(raw, "pet_week"),
    };
  }
  // The lock (build addition): carried only when given, so a submission
  // without it is visibly unmatched and the persona proof is unchanged.
  const proof = str(raw, "order_proof");
  if (proof) answers.order_proof = proof;
  return answers;
}

function defaultRaw() {
  return { bring: PRELOADS.bring.slice(), bag_person: PRELOADS.bag_person.slice() };
}

/* ------------------------------------------------ save-and-resume codec
   A resume code carries the full saved state (answers, place, email) as
   base64url-encoded UTF-8 JSON, prefixed "CW1.". The same string works
   three ways: as the tail of a come-back link (#r=<code>), pasted whole
   into the restore box, or the full link pasted — decodeResume finds the
   code inside any of them. Pure functions: the page and the Node proof
   (proof/proof-resume.js) run this exact code.                        */
function b64urlEncode(str) {
  let b64;
  if (typeof Buffer !== "undefined") {
    b64 = Buffer.from(str, "utf8").toString("base64");
  } else {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    b64 = btoa(bin);
  }
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(s) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  if (typeof Buffer !== "undefined") return Buffer.from(b64, "base64").toString("utf8");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
function encodeResume(state) {
  const payload = { v: 1, raw: state.raw || {}, idx: state.idx || 0, email: state.email || "" };
  return "CW1." + b64urlEncode(JSON.stringify(payload));
}
function decodeResume(text) {
  let s = String(text == null ? "" : text).trim();
  const marker = s.indexOf("#r=");
  if (marker >= 0) s = s.slice(marker + 3);
  else if (s.indexOf("r=") >= 0 && s.indexOf(".") < 0) s = s.slice(s.indexOf("r=") + 2);
  s = s.split("&")[0].split(/\s/)[0];
  if (s.indexOf("CW1.") === 0) s = s.slice(4);
  if (!s) throw new Error("That code looks empty. Paste the whole code or the whole link.");
  let payload;
  try { payload = JSON.parse(b64urlDecode(s)); }
  catch (e) { throw new Error("That code did not work. Check that you copied the whole thing, then try again."); }
  if (!payload || typeof payload !== "object" || !payload.raw || typeof payload.raw !== "object")
    throw new Error("That code did not hold any answers. Check that you copied the whole thing.");
  return { raw: payload.raw, idx: payload.idx || 0, email: payload.email || "" };
}
const RESUME = { encode: encodeResume, decode: decodeResume };

const INTAKE = { PARTS, QUESTIONS, PRELOADS, MED_FIELDS, assembleAnswers, defaultRaw, sanitizeLast4, RESUME };
if (typeof module !== "undefined" && module.exports) module.exports = INTAKE;
if (typeof window !== "undefined") window.INTAKE = INTAKE;
