"use client";

import { AUTH } from "./messages";
import { useSignedIn, useStoredUser } from "./useAuth";

/** "Hi, <username>" once signed in (AC 59); the app's name before that and on the server. */
export function Greeting() {
  const signedIn = useSignedIn();
  const user = useStoredUser();
  return <>{signedIn && user ? AUTH.greeting(user) : AUTH.brand}</>;
}
