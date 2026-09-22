/**
 * Static content for the prototype. Everything here is placeholder copy
 * lifted from the UI specification — no network calls anywhere in this build.
 */

export const APP_NAME = "[APP NAME]";
export const APP_VERSION = "v1.0.0";

export const INTERESTS = [
  "Music",
  "Study",
  "Gaming",
  "Movies",
  "Late night",
  "Just talk",
] as const;

export const LANGUAGES = [
  "Hinglish",
  "Hindi",
  "English",
  "Marathi",
  "Tamil",
  "Bengali",
] as const;

export const COUNTRIES = ["Worldwide", "India", "UAE", "UK"] as const;

export const GENDERS = ["Anyone", "Women", "Men"] as const;

export const REGIONS = [
  "Maharashtra",
  "Karnataka",
  "Delhi NCR",
  "Tamil Nadu",
  "West Bengal",
  "Gujarat",
] as const;

export const SAFETY_TIPS = [
  "Never share your number, address or payment details on a call.",
  "You can leave any call in one tap. You never owe a stranger an explanation.",
  "Report anything sexual, abusive or involving a minor. It takes one tap.",
  "Nobody on this app can see your email, your photo or your exact location.",
];

export const QUICK_REPLIES = ["Say that again?", "Spell it", "One sec"];

export const REPORT_REASONS = [
  { id: "sexual", label: "Sexual content or harassment" },
  { id: "minor", label: "Seems to be under 18" },
  { id: "abuse", label: "Abusive language or threats" },
  { id: "scam", label: "Scam, spam or promotion" },
  { id: "other", label: "Something else" },
] as const;

export type Plan = {
  id: "weekly" | "monthly" | "yearly";
  name: string;
  note: string;
  price: string;
  period: string;
};

export const PLANS: Plan[] = [
  {
    id: "weekly",
    name: "Weekly",
    note: "Try it out",
    price: "[₹]",
    period: "per week",
  },
  {
    id: "monthly",
    name: "Monthly",
    note: "Most popular",
    price: "[₹]",
    period: "per month",
  },
  {
    id: "yearly",
    name: "Yearly",
    note: "Best value",
    price: "[₹]",
    period: "per year",
  },
];

export const PRO_PERKS = [
  { title: "Gender filter", body: "Match only women, only men, or anyone" },
  { title: "Region filter", body: "Nearby cities or any state you pick" },
  { title: "Priority queue", body: "Skip ahead when the queue is busy" },
  {
    title: "Worldwide matching",
    body: "Change country, or open it up to everywhere",
  },
];

export type CallRecord = {
  id: string;
  name: string;
  country: string;
  when: string;
  duration: string;
  /** Two-word handles are guests; a real first name means a verified account. */
  verified: boolean;
  reported?: boolean;
  friend?: boolean;
};

export const CALL_HISTORY: CallRecord[] = [
  {
    id: "c1",
    name: "Rhea",
    country: "India",
    when: "Today, 4:02 PM",
    duration: "04:12",
    verified: true,
  },
  {
    id: "c2",
    name: "Calm Panda",
    country: "Nepal",
    when: "Today, 3:48 PM",
    duration: "00:19",
    verified: false,
    reported: true,
  },
  {
    id: "c3",
    name: "Karan",
    country: "UAE",
    when: "Today, 1:10 PM",
    duration: "12:37",
    verified: true,
    friend: true,
  },
  {
    id: "c4",
    name: "Swift Falcon",
    country: "Nepal",
    when: "Yesterday",
    duration: "02:05",
    verified: false,
  },
  {
    id: "c5",
    name: "Meera",
    country: "UK",
    when: "Yesterday",
    duration: "08:44",
    verified: true,
  },
  {
    id: "c6",
    name: "Bright Otter",
    country: "India",
    when: "Yesterday",
    duration: "01:32",
    verified: false,
  },
  {
    id: "c7",
    name: "Dev",
    country: "India",
    when: "18 Sep",
    duration: "06:10",
    verified: true,
    friend: true,
  },
];

export type Friend = {
  id: string;
  name: string;
  country: string;
  language: string;
  online: boolean;
  since: string;
  preview: string;
  at: string;
  unread?: number;
};

export const FRIENDS: Friend[] = [
  {
    id: "karan",
    name: "Karan",
    country: "UAE",
    language: "Hinglish",
    online: true,
    since: "12 Sep",
    preview: "hey, online now if you want to call",
    at: "8:58 PM",
    unread: 1,
  },
  {
    id: "dev",
    name: "Dev",
    country: "India",
    language: "Hindi",
    online: false,
    since: "9 Sep",
    preview: "haha okay, next time then",
    at: "Yesterday",
  },
  {
    id: "meera",
    name: "Meera",
    country: "UK",
    language: "English",
    online: true,
    since: "2 Sep",
    preview: "sending the playlist name in a sec",
    at: "Mon",
  },
  {
    id: "aisha",
    name: "Aisha",
    country: "UAE",
    language: "English",
    online: false,
    since: "28 Aug",
    preview: "that was a good one",
    at: "Sun",
  },
];

export type Message = {
  id: string;
  from: "me" | "them";
  text: string;
  at?: string;
  day?: string;
};

export const FRIEND_THREAD: Message[] = [
  { id: "m1", from: "them", text: "that call was so random, still laughing" },
  { id: "m2", from: "me", text: "same. free tonight? same time?" },
  { id: "m3", from: "them", text: "yep, ping me around 9", at: "Yesterday" },
  { id: "m4", from: "me", text: "done", at: "Yesterday" },
  {
    id: "m5",
    from: "them",
    text: "hey, online now if you want to call",
    at: "8:58 PM",
  },
];

export const IN_CALL_THREAD: Message[] = [
  { id: "i1", from: "me", text: "wait what was the band name again" },
  { id: "i2", from: "them", text: "Parekh & Singh — spelled with the ampersand" },
  { id: "i3", from: "me", text: "got it, adding to my list", at: "4:51 PM" },
  {
    id: "i4",
    from: "them",
    text: "also the cafe i mentioned is Blue Tokai, Koregaon Park",
    at: "4:52 PM",
  },
];

/** The stranger on the other end of the prototype call. */
export const PEER = {
  name: "Rhea",
  initial: "R",
  country: "India",
  age: 24,
  city: "Pune",
  language: "Hinglish",
};
