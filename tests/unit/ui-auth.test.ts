import { describe, expect, it } from "vitest";
import { AUTH_KEYS, AUTH_SCRIPT, isSignedIn, readAccounts, readRole, readUser, register, signIn, signOut } from "@/ui/auth";

function fakeRoot(auth?: string) {
  const dataset: Record<string, string | undefined> = {};
  if (auth) dataset.auth = auth;
  return { dataset };
}

function fakeStorage(fail = false) {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key: string) => {
      if (fail) throw new Error("blocked");
      return items.get(key) ?? null;
    },
    setItem: (key: string, value: string) => {
      if (fail) throw new Error("blocked");
      items.set(key, value);
    },
    removeItem: (key: string) => {
      if (fail) throw new Error("blocked");
      items.delete(key);
    },
  };
}

describe("AC 59: the demo sign-in", () => {
  it("signs in with any username and password, and keeps the user, the role and the state in this browser", () => {
    const root = fakeRoot();
    const storage = fakeStorage();
    expect(signIn("  Alex  ", "anything", "operator", root, storage)).toBe(true);
    expect(isSignedIn(root)).toBe(true);
    expect(readUser(storage)).toBe("Alex");
    expect(readRole(storage)).toBe("operator");
    expect(storage.items.get(AUTH_KEYS.signedIn)).toBe("1");
  });

  it("stays signed out when the username or the password is missing", () => {
    for (const [name, password] of [
      ["", "secret"],
      ["   ", "secret"],
      ["Alex", ""],
    ]) {
      const root = fakeRoot();
      const storage = fakeStorage();
      expect(signIn(name!, password!, "team-leader", root, storage), `${name}/${password}`).toBe(false);
      expect(isSignedIn(root)).toBe(false);
      expect(storage.items.size).toBe(0);
    }
  });

  it("never stores a password", () => {
    const storage = fakeStorage();
    signIn("Alex", "hunter2", "team-leader", fakeRoot(), storage);
    register({ username: "Sam", email: "sam@example.com", role: "operator" }, "hunter3", fakeRoot(), storage);
    for (const value of storage.items.values()) {
      expect(value).not.toContain("hunter2");
      expect(value).not.toContain("hunter3");
    }
  });

  it("reads an unknown role as team leader, and still signs in for this visit when storage is blocked", () => {
    expect(readRole(fakeStorage())).toBe("team-leader");
    const root = fakeRoot();
    expect(signIn("Alex", "x", "operator", root, fakeStorage(true))).toBe(true);
    expect(isSignedIn(root)).toBe(true);
    expect(readUser(fakeStorage(true))).toBe("");
  });

  it("stamps a remembered sign-in before first paint, and nothing otherwise", () => {
    const run = (storage: ReturnType<typeof fakeStorage>) => {
      const root = fakeRoot();
      new Function("document", "localStorage", AUTH_SCRIPT)({ documentElement: root }, storage);
      return root.dataset.auth;
    };
    const signedIn = fakeStorage();
    signedIn.items.set(AUTH_KEYS.signedIn, "1");
    expect(run(signedIn)).toBe("in");
    expect(run(fakeStorage())).toBeUndefined();
    expect(run(fakeStorage(true))).toBeUndefined();
  });
});

describe("AC 60: create account and sign out", () => {
  it("creates an account, replaces one with the same name, and signs it in", () => {
    const storage = fakeStorage();
    const root = fakeRoot();
    expect(register({ username: "Sam", email: " sam@example.com ", role: "operator" }, "pw", root, storage)).toBe(true);
    expect(register({ username: "sam", email: "", role: "team-leader" }, "pw", root, storage)).toBe(true);
    expect(readAccounts(storage)).toEqual([{ username: "sam", email: "", role: "team-leader" }]);
    expect(isSignedIn(root)).toBe(true);
    expect(readUser(storage)).toBe("sam");
  });

  it("ignores accounts storage that is not a list of accounts", () => {
    const storage = fakeStorage();
    storage.items.set(AUTH_KEYS.accounts, "{not json");
    expect(readAccounts(storage)).toEqual([]);
    storage.items.set(AUTH_KEYS.accounts, JSON.stringify([{ username: "" }, 3, { username: "Kim", role: "boss" }]));
    expect(readAccounts(storage)).toEqual([{ username: "Kim", email: "", role: "team-leader" }]);
  });

  it("signs out but keeps the username and role to offer again", () => {
    const storage = fakeStorage();
    const root = fakeRoot();
    signIn("Alex", "x", "operator", root, storage);
    signOut(root, storage);
    expect(isSignedIn(root)).toBe(false);
    expect(storage.items.has(AUTH_KEYS.signedIn)).toBe(false);
    expect(readUser(storage)).toBe("Alex");
    expect(readRole(storage)).toBe("operator");
  });
});
