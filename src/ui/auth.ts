/**
 * The demo sign-in (AC 59, 60). Nothing here is security: any username and password are accepted, and everything
 * lives in this browser's storage. No password is ever stored. Signed in is stamped as `data-auth="in"` on
 * `<html>` before first paint, so a returning user never sees the sign-in flash.
 */
export type Role = "team-leader" | "operator";

export const ROLES: readonly Role[] = ["team-leader", "operator"];

export const AUTH_KEYS = {
  user: "team-leader:user",
  role: "team-leader:role",
  signedIn: "team-leader:signed-in",
  accounts: "team-leader:accounts",
} as const;

export const AUTH_CHANGED = "team-leader:auth-change";

export interface Account {
  readonly username: string;
  readonly email: string;
  readonly role: Role;
}

interface AuthRoot {
  readonly dataset: Record<string, string | undefined>;
}

interface AuthStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function parseRole(value: string | null | undefined): Role {
  return value === "operator" ? "operator" : "team-leader";
}

/** A username as typed, trimmed, and capped so a pasted essay cannot fill the header. Empty means missing. */
export function cleanUsername(value: string): string {
  return value.trim().slice(0, 40);
}

function read(storage: AuthStorage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function write(storage: AuthStorage, key: string, value: string | null): void {
  try {
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, value);
  } catch {
    // Storage blocked: the sign-in still holds for this visit.
  }
}

export function readUser(storage: AuthStorage): string {
  return cleanUsername(read(storage, AUTH_KEYS.user) ?? "");
}

export function readRole(storage: AuthStorage): Role {
  return parseRole(read(storage, AUTH_KEYS.role));
}

export function isSignedIn(root: AuthRoot): boolean {
  return root.dataset.auth === "in";
}

export function readAccounts(storage: AuthStorage): Account[] {
  try {
    const parsed: unknown = JSON.parse(read(storage, AUTH_KEYS.accounts) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item: unknown) => {
      if (typeof item !== "object" || item === null) return [];
      const { username, email, role } = item as Record<string, unknown>;
      const name = typeof username === "string" ? cleanUsername(username) : "";
      if (name === "") return [];
      return [{ username: name, email: typeof email === "string" ? email.trim() : "", role: parseRole(typeof role === "string" ? role : null) }];
    });
  } catch {
    return [];
  }
}

/** Signs in whoever typed a username and a password. Returns false, changing nothing, when either is missing. */
export function signIn(username: string, password: string, role: Role, root: AuthRoot, storage: AuthStorage): boolean {
  const name = cleanUsername(username);
  if (name === "" || password === "") return false;
  write(storage, AUTH_KEYS.user, name);
  write(storage, AUTH_KEYS.role, role);
  write(storage, AUTH_KEYS.signedIn, "1");
  root.dataset.auth = "in";
  return true;
}

/** Adds the account (replacing one with the same username) and signs it in. The password is never kept. */
export function register(account: Account, password: string, root: AuthRoot, storage: AuthStorage): boolean {
  const name = cleanUsername(account.username);
  if (name === "" || password === "") return false;
  const others = readAccounts(storage).filter((existing) => existing.username.toLowerCase() !== name.toLowerCase());
  write(storage, AUTH_KEYS.accounts, JSON.stringify([...others, { username: name, email: account.email.trim(), role: account.role }]));
  return signIn(name, password, account.role, root, storage);
}

/** Signs out but keeps the username and role, so the sign-in can offer them again. */
export function signOut(root: AuthRoot, storage: AuthStorage): void {
  write(storage, AUTH_KEYS.signedIn, null);
  delete root.dataset.auth;
}

/** Runs in <head> before first paint, so a signed-in user never sees the sign-in flash. */
export const AUTH_SCRIPT = `try{if(localStorage.getItem(${JSON.stringify(AUTH_KEYS.signedIn)})==="1")document.documentElement.dataset.auth="in"}catch(e){}`;
