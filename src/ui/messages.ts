import { crewStatus, type StatusView } from "./status";

export const CREW_STAYS = "This does not release the crew.";
export const RECORDS_ONLY = "This records your decision here. Nobody is notified automatically yet.";
export const STOCK_STALE = "These stock figures are more than a day old. Check with the warehouse before relying on them.";
export const SUBSTITUTES = "Substitutes";
export const GIVE_REASON = "Give a reason.";
export const MANAGER_CHECK = "A manager has to verify this catalogue match.";

export const EMPTY = {
  sites: "No sites to show.",
  actions: "Nothing recorded for this site yet.",
  penetrations: "No penetrations planned for this site.",
} as const;

export const PENETRATION_FILTER = {
  showAll: "Show all",
  unknown: "That material is not a shortage on this site. Showing all penetrations.",
} as const;

/** The menu: the bottom tab bar (AC 37) and the side menu (AC 47). */
export const NAV = {
  collapse: "Collapse menu",
  expand: "Expand menu",
  title: "Team leader",
  label: "Main",
  sites: "Projects",
  materials: "Inventory",
  actions: "Decisions",
  about: "Guide",
} as const;

export const THEME = {
  legend: "Theme",
  system: "System",
  light: "Light",
  dark: "Dark",
} as const;

export const ACTIONS_LOG = {
  unavailable: "We can't load the decisions right now. Try again shortly.",
  siteUnavailable: "We can't check this site's actions right now.",
  empty: "No sites to show.",
} as const;

export const PENETRATION_LOG = {
  unavailable: "We can't load this penetration's actions right now. Try again shortly.",
  empty: "Nothing recorded for this penetration yet.",
} as const;

export const MATERIAL_LOG = {
  unavailable: "We can't load this material's actions right now. Try again shortly.",
  empty: "Nothing recorded for this material yet.",
} as const;

/** The site a material-log entry was recorded at. */
export function atSite(siteName: string): string {
  return `At ${siteName}`;
}

/** Shown above the site list when that site's actions could not be read. */
export const DECISIONS_NOTICE = "Can't check decisions right now. Rows don't show them.";

/** How widely a material decision on one penetration still applies. */
export function appliesToPenetrations(count: number): string {
  return `Applies to all ${count} penetrations at this site`;
}

export const MATERIALS = {
  title: NAV.materials,
  detailTitle: "Material",
  empty: "No materials planned at any site.",
  emptyChecked: "No materials planned at the sites that could be checked.",
  unavailable: "Can't check stock right now. Don't assume any material is in stock. Try again.",
  notShortAnywhere: "Not short at any site",
  siteUnavailable: "Can't check this site right now. Don't assume it has enough.",
} as const;

export const NO_FILTER_MATCH = "No penetrations match these filters.";

/** The projects list's filter (AC 72, 73). The readiness labels are qantum-stock's. */
export const SITE_FILTER = {
  label: "Filter projects",
  search: "Search projects",
  searchPlaceholder: "Name, job ref or address",
  readiness: "Readiness",
  options: { all: "All statuses", ready: "Ready", shortage: "Shortage", unknown: "Unknown" },
  apply: "Apply",
  reset: "Reset",
  list: "Projects",
  noMatch: "No projects match these filters.",
  count: (shown: number, total: number) => `${shown} of ${total} ${total === 1 ? "project" : "projects"}`,
} as const;

export function filterLine(materialName: string, shown: number, total: number): string {
  return `Using ${materialName} · ${shown} of ${total}`;
}

export const FILTERS = {
  label: "Filter penetrations",
  shortages: "Shortages",
  dataProblems: "Data problems",
  acted: "Acted",
} as const;

export const SITES_UNAVAILABLE = "Can't check the sites right now. Don't assume any site is clear. Try again.";

export const BUTTONS = {
  wait: "Wait",
  escalate: "Escalate",
  propose: "Propose this",
  sendEscalation: "Send escalation",
  sendWait: "Send wait",
  sendProposal: "Send proposal",
  cancel: "Cancel",
  sending: "Sending…",
  tryAgain: "Try again",
} as const;

export const ANNOUNCE = {
  escalation: "Escalation recorded",
  wait: "Wait recorded",
  proposal: "Proposal recorded",
  replay: "Already recorded",
} as const;

/** The connection bar, the offline banner and Offline details (AC 48). */
export const CONNECTION = {
  online: "Online",
  offline: "Offline",
  checking: "Checking",
  backOnline: "Back online",
  wentOffline: "You're offline",
  stillOffline: "Still offline. Nothing was sent.",
  synced: "Synced",
  offlineRegion: "Offline",
  details: "Offline details",
  detailsTitle: "Offline details",
  lastOnline: "Last online",
  pageFrom: "This screen is from",
  stockFrom: "Stock figures from",
  waiting: "Waiting to send",
  nothingWaiting: "Nothing",
  notYet: "Not yet",
  unknown: "Unknown",
  syncNow: "Sync now",
  syncing: "Syncing…",
  close: "Close",
} as const;

const FALLBACK = "Something went wrong. Nothing was recorded.";

const ERRORS: Readonly<Record<string, string>> = {
  validation_failed: "Check the highlighted fields.",
  payload_too_large: "That's too long. Shorten it.",
  shortage_not_found: "That shortage no longer exists. Refresh to see the latest.",
  stale_nomination: "This penetration's nomination has changed. Refresh and try again.",
  not_a_candidate: "That solution is no longer a candidate. Refresh and try again.",
  idempotency_key_reused: "Something went wrong sending that. Close this and try again.",
  upstream_unavailable: "A system we depend on isn't available. Nothing was recorded. Try again.",
  upstream_invalid: "A system we depend on isn't available. Nothing was recorded. Try again.",
  transport_failed: "Couldn't reach the server. The decision may not have been recorded. Send again to retry; it won't be recorded twice.",
  offline: "You're offline, so nothing was sent. Switch Online back on to send it, or phone the warehouse.",
};

const UNAVAILABLE_BANNER: StatusView = {
  label: "Can't check this site right now. Don't assume it's clear. Try again.",
  tone: "warning",
  icon: "warning",
};

export function apiErrorMessage(code: string): string {
  return ERRORS[code] ?? FALLBACK;
}

/** Banner for a clear site, or for nothing planned. A blocked site has no banner: the rows say why (AC 34). */
export function readinessBanner(status: string): StatusView {
  switch (status) {
    case "blocked":
      return { label: "Blocked: hold the crew.", tone: "danger", icon: "stop" };
    case "nothing_planned":
      return { label: "Nothing planned for this site", tone: "neutral", icon: "dashed-circle" };
    case "clear":
      return crewStatus("clear");
    case "unavailable":
      return UNAVAILABLE_BANNER;
    default:
      return UNAVAILABLE_BANNER;
  }
}

/** The demo sign-in (AC 59, 60). Any username and password work; nothing leaves this browser. */
export const AUTH = {
  brand: NAV.title,
  signInTitle: "Sign in",
  signInIntro: "This is a demo: any username and password will do. Nothing leaves this browser.",
  username: "Username",
  password: "Password",
  showPassword: "Show password",
  role: "Sign in as",
  roles: { "team-leader": "Team leader", operator: "Operator" },
  signIn: "Sign in",
  forgot: "Forgot password?",
  newHere: "New here?",
  createAccount: "Create an account",
  registerTitle: "Create an account",
  email: "Email (optional)",
  confirmPassword: "Confirm password",
  create: "Create account",
  haveAccount: "Already have an account?",
  backToSignIn: "Back to sign in",
  forgotTitle: "Reset your password",
  forgotIntro: "Enter your username or email and we'll send a reset link.",
  usernameOrEmail: "Username or email",
  sendReset: "Send reset link",
  resetSent: "This is a demo, so no email was sent. Go back and sign in with any password.",
  missingUsername: "Enter your username.",
  missingPassword: "Enter your password.",
  missingUsernameOrEmail: "Enter your username or email.",
  passwordsDiffer: "The passwords don't match.",
  signOut: "Sign out",
  greeting: (name: string) => `Hi, ${name}`,
} as const;

/** The pick check and pick-error reports (AC 61 to 66). */
export const PICKS = {
  heading: "Picks",
  sample: "(sample)",
  notReady: (count: number) => `Not ready · ${count} pick ${count === 1 ? "issue" : "issues"}`,
  notReadyText: "The warehouse marked every line Picked, but these don't match the plan. Fix them before the crew goes.",
  ready: "Picks match the plan",
  readyText: "Every line the warehouse picked matches the plan, with its parts.",
  noList: "Can't check picks",
  noListText: "There is no pick list for this site yet. Don't assume anything is picked.",
  unavailable: "Can't check picks right now. Don't assume they're complete. Try again.",
  review: "Review pick issues",
  offlineHeading: "Can't confirm · offline",
  offlineText: (count: number) =>
    `Last known: ${count} pick ${count === 1 ? "issue" : "issues"}. You can review them and write a report now. It sends when you're back online.`,
  offlineReview: "Review saved pick issues",
  pickedBy: "Picked by · warehouse",
  pickedBySaved: "Picked by · warehouse (saved contact)",
  pickerRole: "Warehouse picker",
  lastAction: (action: string, at: string) => `Last action: ${action.toLowerCase()} · ${at}`,
  asKnownAt: (at: string) => `As known at ${at}`,
  pickerLastAction: (name: string, action: string, at: string) => `${name}'s last action: ${action.toLowerCase()} · ${at}`,
  phone: "Phone",
  email: "Email",
  call: "Call",
  callOffline: "Call (works offline)",
  emailAction: "Email",
  emailOffline: "Email · queues on this phone",
  materials: "Materials · planned vs picked",
  materialsSaved: (at: string) => `Materials · last known ${at}`,
  // Not "Crew can go": a locked button must never read as the go state (AC 9 keeps that text off unchecked sites).
  sendCrew: "Send the crew",
  noOperator: "There is no operator to tell for this site.",
  offlineReadyText: "Last known: picks matched the plan. Sending the crew needs a live check.",
  openCheck: "Open the pick check",
  crewLocked: "Unlocks when every material matches the plan.",
  crewNotClear: "Unlocks when the site is clear too.",
  crewOffline: "Needs a live check. Never decided from saved data.",
  crewTell: "Texts the operator to send the crew.",
  waitingText: "Saved on this phone · sends automatically",
  // The Pick check page (AC 64).
  checkTitle: (count: number) => (count === 0 ? "Pick check" : `Pick check · ${count} ${count === 1 ? "issue" : "issues"}`),
  checkIntro:
    "The warehouse marked these Picked. The app compared the pick list with the plan and found problems. The warehouse status never overrides this check.",
  checkReadyIntro: "The app compared the pick list with the plan. Every line matches, parts included.",
  checkOffline: "These issues are the last known. A re-pick may have fixed some of them.",
  planNeeds: "Plan needs",
  picked: "Picked",
  lowerRating: "Not the rating planned",
  report: "Report to warehouse",
  waitRepick: "Wait for re-pick",
  waitRepickText: "Records nothing. The site stays Not ready until a re-pick matches the plan.",
  callPicker: (name: string) => `Call ${name}`,
  // The report form (AC 65, 66).
  reportTitle: "Report pick error",
  reportTo: (siteName: string, picker: string | null) => (picker ? `${siteName} · to ${picker}, warehouse` : siteName),
  whatsWrong: "What's wrong?",
  kinds: {
    wrong_spec: "Wrong spec or rating",
    missing_parts: "Marked picked, parts missing",
    part_picked: "Partly picked, accessory missing",
    unsuitable: "Doesn't fit on site",
    wrong_item: "Wrong item",
    damaged: "Damaged, on the way or during the work",
    other: "Something else",
  },
  // The site review (AC 67 to 71).
  /** Short names for what was found, on a row and a card. */
  foundKinds: {
    wrong_spec: "Wrong spec",
    missing_parts: "Parts missing",
    part_picked: "Partly picked",
    unsuitable: "Doesn't fit",
    wrong_item: "Wrong item",
    damaged: "Damaged",
    other: "Something else",
  },
  requests: { repick: "Re-pick for the next delivery", same_day: "Same-day delivery" },
  requestAsked: { repick: "re-pick asked", same_day: "same-day delivery asked" },
  affected: (count: number) => `${count} affected`,
  whatsFound: "What did the site find?",
  chooseKind: "Choose what's wrong.",
  affectedQty: "How many are affected?",
  whatsNeeded: "What's needed?",
  reviewButton: "Review",
  reviewTitle: "Review on site",
  reviewQuestion: "Is it right on site?",
  reviewIntro: "The warehouse marked it Picked. Check it yourself: the right item, the right amount, nothing damaged.",
  reviewRight: "Yes, it's right",
  reviewRightHint: "Records it as checked on site.",
  reviewWrong: "No, something's wrong",
  reviewWrongHint: "Report it to the warehouse for a re-pick or a same-day delivery.",
  reviewFooter: "A line reported from site stays Not ready until a review on site says it's right.",
  reviewSending: "Saving…",
  reviewSent: "Checked on site.",
  reviewQueued: "Saved on this phone. It sends by itself when you're back online.",
  reviewOffline: "You can still review it. Your answer is saved on this phone and sent when you're back online.",
  reviewFailed: "The review could not be saved. Try again.",
  reviewNoLine: "That line is not on this site's pick list.",
  backToSite: "Back to the site",
  reportFromSite: "Report to warehouse",
  reportFromSiteFooter: "The line reads Reported on site until a review on site says it's right.",
  checkedOnSite: (at: string) => `Checked on site ${at}`,
  reportedOnSite: (at: string, finding: string) => `Reported ${at} · ${finding}`,
  reportedCard: (at: string, finding: string) =>
    `Reported from site ${at}: ${finding}. It stays Reported until a review on site says it's right.`,
  notReadyReportedText: "The warehouse marked every line Picked, but the pick list or the site found problems. Fix them before the crew goes.",
  checkReportedIntro: "Reports from site count too: a reported line stays an issue until a review on site says it's right.",
  waitingAll: (reports: number, reviews: number) => {
    const parts: string[] = [];
    if (reports > 0) parts.push(`${reports} ${reports === 1 ? "report" : "reports"}`);
    if (reviews > 0) parts.push(`${reviews} ${reviews === 1 ? "review" : "reviews"}`);
    return `${parts.join(" and ")} waiting to send`;
  },
  material: "Material",
  plannedQty: "Plan needs",
  pickedQty: "Actually picked",
  missingPart: "Missing accessory or part",
  note: "Note",
  photo: "Add photo of the picked stock",
  photoAdded: (name: string) => `Photo added: ${name}. It stays on this phone in the demo.`,
  sendTo: "Send to",
  toPicker: (name: string) => `${name} · warehouse picker`,
  toPickerUnnamed: "The warehouse picker",
  toPurchasing: "Purchasing (if we need to order)",
  noRecipient: "Choose who gets the report.",
  badAmount: "Enter a whole number, 0 or more.",
  offlineNote: "No signal? The report is saved on this phone and sends by itself when you're back online. It won't be sent twice.",
  send: "Send report",
  sending: "Sending…",
  footer: "The site stays Not ready until a re-pick matches the plan.",
  sent: "Report sent to the warehouse.",
  queued: "Saved on this phone. It sends by itself when you're back online.",
  failed: "The report could not be sent. Check it and try again.",
  backToCheck: "Back to the pick check",
  outboxSentAll: (reports: number, reviews: number) => {
    const parts: string[] = [];
    if (reports > 0) parts.push(`${reports} pick ${reports === 1 ? "report" : "reports"}`);
    if (reviews > 0) parts.push(`${reviews} ${reviews === 1 ? "review" : "reviews"}`);
    return `${parts.join(" and ")} sent`;
  },
} as const;
