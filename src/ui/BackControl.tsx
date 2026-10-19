"use client";

import { useSyncExternalStore, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { backTarget, previousScreen, returnsToPrevious, subscribeNavHistory } from "./nav-history";
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
