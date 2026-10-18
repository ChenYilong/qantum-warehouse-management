import Link from "next/link";
import { ACTION_NEEDED, type ActionNeededView } from "./action-needed";
import { contactRoles, telHref, type ContactView } from "./contacts";
import { EscalateDialog } from "./decisions/EscalateDialog";
import { WaitDialog } from "./decisions/WaitDialog";
import { Icon } from "./Icon";
import styles from "./primitives.module.css";

/**
 * The top of a blocked site (AC 50): one heading that says it needs a decision, the short materials with
 * Wait and Escalate right there, the data problems, what is covered, what each option does, and who to call.
 * Nothing here releases the crew: the dialogs keep saying so.
 */
export function ActionNeeded({
  siteId,
  view,
  operator,
  picker,
}: {
  siteId: string;
  view: ActionNeededView;
  operator?: ContactView;
  picker?: ContactView;
}) {
  const contacts = contactRoles(operator, picker);
  return (
    <section id="action-needed" className={styles.actionPanel} aria-labelledby="action-needed-heading">
      <h2 id="action-needed-heading" className={styles.actionHeading}>
        {ACTION_NEEDED.heading}
      </h2>
      <p className={styles.actionSummary}>
        <Icon name="stop" />
        <span>{view.summary}</span>
      </p>

      {view.shortages.length > 0 ? (
        <>
          <h3>{ACTION_NEEDED.shortHeading}</h3>
          <ul className={styles.actionList}>
            {view.shortages.map((item) => (
              <li key={item.id} className={styles.actionItem}>
                <p className={`${styles.actionMaterial} ${styles[item.tone]}`}>
                  <Icon name={item.tone === "danger" ? "stop" : "warning"} />
                  <span>
                    <span className={styles.actionMaterialName}>{item.name}</span>
                    <span className={styles.actionFigure}>{item.line}</span>
                  </span>
                </p>
                <Link className={styles.actionLink} href={item.href}>
                  <span>{item.affected}</span>
                  <Icon name="chevron-right" />
                </Link>
                <div className={styles.row}>
                  <WaitDialog siteId={siteId} shortageId={item.id} target={item.target} />
                  <EscalateDialog siteId={siteId} shortageId={item.id} target={item.target} />
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {view.dataProblems ? (
        <>
          <h3>{ACTION_NEEDED.dataHeading}</h3>
          <Link className={styles.actionLink} href={view.dataProblems.href}>
            <span>
              {view.dataProblems.line} · {view.dataProblems.affected}
            </span>
            <Icon name="chevron-right" />
          </Link>
        </>
      ) : null}

      <h3>{ACTION_NEEDED.optionsHeading}</h3>
      <dl className={styles.optionList}>
        {ACTION_NEEDED.options.map((option) => (
          <div key={option.name}>
            <dt>{option.name}</dt>
            <dd>{option.effect}</dd>
          </div>
        ))}
      </dl>

      {view.covered.length > 0 ? (
        <>
          <h3>{ACTION_NEEDED.coveredHeading}</h3>
          <p>{view.covered.join(" · ")}</p>
          <p className={styles.muted}>{ACTION_NEEDED.coveredNote}</p>
        </>
      ) : null}

      {contacts.length > 0 ? (
        <>
          <h3>{ACTION_NEEDED.contactsHeading}</h3>
          <ul className={styles.actionList}>
            {contacts.map(({ role, contact }) => (
              <li key={role} className={styles.contactRow}>
                <span>
                  <span className={styles.muted}>{role}</span>
                  <br />
                  <strong>{contact.name}</strong>
                </span>
                <a className={styles.button} href={telHref(contact.phone)} aria-label={`${ACTION_NEEDED.call} ${contact.name}, ${role.toLowerCase()}`}>
                  {ACTION_NEEDED.call}
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
