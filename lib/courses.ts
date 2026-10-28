import type { LevelId, Tier } from "./types";

export type Level = {
  id: LevelId;
  name: string;
  pron: string;
  ages: string;
  audience: string;
  color: string;
  tint: string;
  tagline: string;
  /** Numbered "senses", dictionary-style: what the learner gets. */
  senses: string[];
  sampleWords: string[];
};

export const LEVELS: Level[] = [
  {
    id: 1,
    name: "Bitsy",
    pron: "/ˈbɪt.si/",
    ages: "Ages 4–6",
    audience: "Little learners",
    color: "#C98A12",
    tint: "#FDF3DC",
    tagline: "First words, big wonder.",
    senses: ["Picture-and-sound words a child can point at", "Short read-along stories with Bitsy", "Gentle quizzes, stickers, and a first certificate"],
    sampleWords: ["apple", "jump", "happy"],
  },
  {
    id: 2,
    name: "Byte",
    pron: "/baɪt/",
    ages: "Ages 7–10",
    audience: "Young readers",
    color: "#0891B2",
    tint: "#E0F7FB",
    tagline: "Everyday words, every day.",
    senses: ["School and everyday vocabulary", "Short quotes and what they mean", "Reading games that build confidence"],
    sampleWords: ["brave", "explore", "gentle"],
  },
  {
    id: 3,
    name: "Cortex",
    pron: "/ˈkɔːr.tɛks/",
    ages: "Ages 11–21",
    audience: "Students",
    color: "#7C3AED",
    tint: "#F1EAFE",
    tagline: "Think in sharper words.",
    senses: ["Academic vocabulary and idioms", "Critical thinking through words", "AI literacy: asking and checking AI well"],
    sampleWords: ["nuance", "bias", "infer"],
  },
  {
    id: 4,
    name: "Nova",
    pron: "/ˈnoʊ.və/",
    ages: "Ages 22–40",
    audience: "Professionals",
    color: "#1B2A4A",
    tint: "#E6EAF2",
    tagline: "Words that move work forward.",
    senses: ["Professional vocabulary for meetings and email", "Clear, confident communication", "Life quotations to think and lead with"],
    sampleWords: ["leverage", "concise", "resilient"],
  },
  {
    id: 5,
    name: "Atlas",
    pron: "/ˈæt.ləs/",
    ages: "All ages · mastery",
    audience: "Word masters",
    color: "#B45309",
    tint: "#FBEEDC",
    tagline: "The whole map of language.",
    senses: ["Etymology: where words come from", "Rhetoric and persuasive writing", "AI-assisted language mastery"],
    sampleWords: ["eloquent", "ethos", "lexicon"],
  },
];

/** One word, explained at every level — the core of the product. */
export const WORD_OF_THE_DAY = {
  word: "curious",
  syllables: "cu·ri·ous",
  pron: "/ˈkjʊə.ri.əs/",
  pos: "adjective",
  etymology: "From Latin cūriōsus, “careful, inquisitive,” from cūra, “care.”",
  byLevel: {
    1: { def: "Wanting to know more! Like when you peek inside a box to see what's there.", example: "The curious cat looked under the bed." },
    2: { def: "Eager to learn or find out about something.", example: "Sam was curious about how rainbows are made." },
    3: { def: "Having a strong desire to know or learn; also, strange or unusual.", example: "Curious minds ask why — then ask again. (Also: “a curious detail.”)" },
    4: { def: "Inquisitive in a way that opens doors: curious people ask better questions.", example: "Stay curious in negotiations — ask before you assume." },
    5: { def: "Double-edged: the curious observer, and the curious object observed. Shares a root with “cure” and “accurate” — all about care.", example: "“Curiouser and curiouser!” cried Alice. — Lewis Carroll" },
  } as Record<LevelId, { def: string; example: string }>,
};

export const TIERS: { id: Tier; name: string; pron: string; price: string; period: string; blurb: string; includes: string[]; highlight?: boolean }[] = [
  {
    id: "reader",
    name: "Reader",
    pron: "/ˈriː.dər/",
    price: "Free",
    period: "",
    blurb: "A new word in your inbox, every day.",
    includes: ["Word & Quote of the Day", "Weekly newsletter", "Level 1 preview lessons"],
  },
  {
    id: "learner",
    name: "Learner",
    pron: "/ˈlɜːr.nər/",
    price: "₱299",
    period: "/ month",
    blurb: "One full level, start to certificate.",
    includes: ["Everything in Reader", "Full access to 1 level of your choice", "Quizzes + final exam (3 attempts)", "Verified certificate"],
    highlight: true,
  },
  {
    id: "scholar",
    name: "Scholar",
    pron: "/ˈskɒl.ər/",
    price: "₱599",
    period: "/ month",
    blurb: "Every level, for the whole family.",
    includes: ["Everything in Learner", "All 5 levels & certificates", "Event discounts", "Early access: dictionary book & Quote Box"],
  },
];
