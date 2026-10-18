import { formatReference, sitePath } from "./format";
import { shortFacts, signalView, type ShortageFact, type ShortFacts, type SignalView } from "./signal";

/** A person to call or text. The UI's own shape, so client code never imports the ports. */
export interface ContactView {
  readonly name: string;
  readonly phone: string;
}

/** `tel:+447700900156`: digits and the leading plus only. */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^+0-9]/g, "")}`;
}

/**
 * `sms:+447700900156?&body=...`. The `?&` form opens the message with the text on both iOS and Android. The
 * team leader still presses send, so nothing goes out on its own.
 */
export function smsHref(phone: string, body: string): string {
  return `sms:${phone.replace(/[^+0-9]/g, "")}?&body=${encodeURIComponent(body)}`;
}

function countOf(value: number, singular: string, plural: string): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

/** The text a team leader sends the operator when a site is clear. Keeps the shared-stock wording. */
export function readyText(siteName: string, reference: string): string {
  return `${siteName}, ${formatReference(reference)}: materials for the planned work are on hand (shared, not reserved). You can go. From your team leader.`;
}

/**
 * The text for a blocked site (AC 55). The operator may already be on the way, so it says to hold, what is short
 * (three at most, then a count; names can hold commas, so they are split with semicolons) and that word will follow.
 * It never says the crew can go.
 */
export function blockedText(siteName: string, reference: string, shortages: readonly ShortageFact[], dataProblems: number): string {
  const parts: string[] = [];
  if (shortages.length > 0) {
    const { items, more } = shortFacts(shortages);
    parts.push("parts are NOT complete. Don't go yet.");
    parts.push(`Short: ${items.join("; ")}${more > 0 ? ` and ${more} more` : ""}.`);
    if (dataProblems > 0) parts.push(`Also ${countOf(dataProblems, "data problem", "data problems")} to check.`);
  } else {
    parts.push("I can't confirm the materials yet. Don't go yet.");
    if (dataProblems > 0) parts.push(`${countOf(dataProblems, "data problem", "data problems")} to check.`);
  }
  parts.push("I'll message you when it's sorted. From your team leader.");
  return `${siteName}, ${formatReference(reference)}: ${parts.join(" ")}`;
}

/** The text for a site that can't be checked: the leader knows nothing, so the operator is told to wait. */
export function holdText(siteName: string, reference: string): string {
  return `${siteName}, ${formatReference(reference)}: I can't check the materials right now. Don't go until I confirm. From your team leader.`;
}

export interface SiteActionInput {
  readonly id: string;
  readonly name: string;
  readonly reference: string;
  readonly crewStatus: string;
  readonly shortageCount: number;
  readonly dataProblemCount: number;
  /** The blocked site's short materials, for its card and its text. */
  readonly shortages?: readonly ShortageFact[];
  readonly operator?: ContactView;
}

/** What a tap on the big signal does (AC 54). A signal never starts a text, and an unchecked one never calls. */
export type TapAction =
  | { readonly kind: "call"; readonly href: string; readonly hint: string }
  | { readonly kind: "retry"; readonly hint: string }
  | { readonly kind: "none"; readonly hint: string | null };

export interface OperatorActions {
  readonly name: string;
  readonly textHref: string;
  readonly callHref: string;
}

/**
 * Everything a site shows beside its status (AC 49, 52, 54, 55, 57): the signal, what a tap on it does, how to
 * tell the operator, where a blocked site goes next, and what is short.
 */
export interface SiteAction {
  readonly signal: SignalView;
  readonly tap: TapAction;
  /** Null when there is no operator, or no work planned to tell them about. */
  readonly operator: OperatorActions | null;
  /** A blocked site's way to its Needs your decision panel. */
  readonly decide: { readonly label: string; readonly href: string } | null;
  readonly short: ShortFacts;
}

export const SITE_ACTIONS = {
  operator: "Operator",
  textOperator: "Text operator",
  callOperator: "Call operator",
  shortages: "Sort out shortages",
  dataProblems: "Check data problems",
  noOperator: "No operator assigned",
  tapToCall: "Tap to call",
  checkAgain: "Tap to check again",
  shortLabel: "Short:",
} as const;

function operatorActions(operator: ContactView, text: string): OperatorActions {
  return { name: operator.name, textHref: smsHref(operator.phone, text), callHref: telHref(operator.phone) };
}

export function siteAction(site: SiteActionInput): SiteAction {
  const signal = signalView(site.crewStatus);
  const none: ShortFacts = { items: [], more: 0 };

  if (signal.tone === "idle") {
    return { signal, tap: { kind: "none", hint: null }, operator: null, decide: null, short: none };
  }

  const text =
    signal.tone === "go"
      ? readyText(site.name, site.reference)
      : signal.tone === "stop"
        ? blockedText(site.name, site.reference, site.shortages ?? [], site.dataProblemCount)
        : holdText(site.name, site.reference);
  const operator = site.operator ? operatorActions(site.operator, text) : null;

  if (signal.tone === "unknown") {
    return { signal, tap: { kind: "retry", hint: SITE_ACTIONS.checkAgain }, operator, decide: null, short: none };
  }

  const tap: TapAction = operator
    ? { kind: "call", href: operator.callHref, hint: SITE_ACTIONS.tapToCall }
    : { kind: "none", hint: SITE_ACTIONS.noOperator };
  if (signal.tone === "go") return { signal, tap, operator, decide: null, short: none };

  const decide =
    site.shortageCount > 0
      ? { label: SITE_ACTIONS.shortages, href: `${sitePath(site.id)}#action-needed` }
      : { label: SITE_ACTIONS.dataProblems, href: `${sitePath(site.id)}?show=data-problems` };
  return { signal, tap, operator, decide, short: shortFacts(site.shortages ?? []) };
}

/** "Picker and operator" when one person does both, as at a small site. */
export function contactRoles(operator: ContactView | undefined, picker: ContactView | undefined): { readonly role: string; readonly contact: ContactView }[] {
  if (operator && picker && operator.name === picker.name && telHref(operator.phone) === telHref(picker.phone)) {
    return [{ role: "Picker and operator", contact: operator }];
  }
  const roles: { role: string; contact: ContactView }[] = [];
  if (picker) roles.push({ role: "Picker (warehouse)", contact: picker });
  if (operator) roles.push({ role: "Operator", contact: operator });
  return roles;
}
