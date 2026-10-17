import { formatReference, sitePath } from "./format";

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

/** The text a team leader sends the operator when a site is clear. Keeps the shared-stock wording. */
export function readyText(siteName: string, reference: string): string {
  return `${siteName}, ${formatReference(reference)}: materials for the planned work are on hand (shared, not reserved). You can go. From your team leader.`;
}

export interface SiteActionInput {
  readonly id: string;
  readonly name: string;
  readonly reference: string;
  readonly crewStatus: string;
  readonly shortageCount: number;
  readonly dataProblemCount: number;
  readonly operator?: ContactView;
}

/**
 * The one main action on a site card (AC 49). A clear site notifies its operator, who is always told first and
 * passes word to the picker. A blocked site goes to what needs a decision. Anything unknown offers a retry,
 * never a way to send the crew.
 */
export type SiteAction =
  | { readonly kind: "notify"; readonly operator: ContactView; readonly textHref: string; readonly callHref: string }
  | { readonly kind: "decide"; readonly label: string; readonly href: string }
  | { readonly kind: "retry" }
  | { readonly kind: "none" };

export const SITE_ACTIONS = {
  operator: "Operator",
  textOperator: "Text operator",
  callOperator: "Call operator",
  shortages: "Sort out shortages",
  dataProblems: "Check data problems",
  noOperator: "No operator assigned",
} as const;

export function siteAction(site: SiteActionInput): SiteAction {
  if (site.crewStatus === "clear") {
    if (!site.operator) return { kind: "none" };
    return {
      kind: "notify",
      operator: site.operator,
      textHref: smsHref(site.operator.phone, readyText(site.name, site.reference)),
      callHref: telHref(site.operator.phone),
    };
  }
  if (site.crewStatus === "blocked") {
    if (site.shortageCount > 0) return { kind: "decide", label: SITE_ACTIONS.shortages, href: `${sitePath(site.id)}#action-needed` };
    return { kind: "decide", label: SITE_ACTIONS.dataProblems, href: `${sitePath(site.id)}?show=data-problems` };
  }
  if (site.crewStatus === "nothing_planned") return { kind: "none" };
  return { kind: "retry" };
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
