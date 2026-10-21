"use client";

import { useSyncExternalStore, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { backTarget, canGoBack, previousScreen, returnsToPrevious, subscribeNavHistory } from "./nav-history";
import styles from "./primitives.module.css";

/**
 * The chevron back link (AC 85). It leads back where the visit came from: the top-level page underneath, named, or
 * else the page's own target (`href`, `name`), used when it was opened directly. When the target is the screen
 * underneath it pops that history entry, so the page is revealed at once.
 */
export function BackControl({ href, name, className }: { href: string; name: string; className?: string }) {
  const router = useRouter();
  const previous = useSyncExternalStore(subscribeNavHistory, previousScreen, () => null);
  const target = backTarget({ href, name }, previous);

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return;
    if (!returnsToPrevious(target.href)) return;
    event.preventDefault();
    router.back();
  }

  return (
    <Link className={className} href={target.href} aria-label={`Back to ${target.name}`} onClick={onClick}>
      <Icon name="chevron-left" />
      <span className={styles.backLabel}>{target.name}</span>
    </Link>
  );
}

/**
 * A control that goes back the way the browser does (AC 96): with a screen under this one in the visit, a tap pops
 * history, so that screen comes back exactly as it was, its own back control included. Opened directly, it opens
 * `href`. A modified click (new tab, new window) always follows `href`.
 */
export function HistoryBackLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const router = useRouter();

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return;
    if (!canGoBack()) return;
    event.preventDefault();
    router.back();
  }

  return (
    <Link className={className} href={href} onClick={onClick}>
      {children}
    </Link>
  );
}
