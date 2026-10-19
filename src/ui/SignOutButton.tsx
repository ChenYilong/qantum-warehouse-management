"use client";

import { signOut } from "./auth";
import { Button } from "./Button";
import { AUTH } from "./messages";
import { authStorage, notifyAuth } from "./useAuth";
import styles from "./primitives.module.css";

/** Sign out, at the Guide's top right (AC 60). The sign-in comes back with the username filled in. */
export function SignOutButton() {
  return (
    <Button
      type="button"
      className={styles.signOut}
      onClick={() => {
        signOut(document.documentElement, authStorage());
        notifyAuth();
      }}
    >
      {AUTH.signOut}
    </Button>
  );
}
