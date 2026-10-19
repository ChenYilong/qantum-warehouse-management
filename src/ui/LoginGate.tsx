"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { register, ROLES, signIn, type Role } from "./auth";
import { Button } from "./Button";
import { AUTH } from "./messages";
import { authStorage, notifyAuth, useSignedIn, useStoredRole, useStoredUser } from "./useAuth";
import dialogStyles from "./decisions/decisions.module.css";
import styles from "./primitives.module.css";

type View = "signIn" | "register" | "forgot" | "resetSent";

type Errors = Partial<Record<"username" | "password" | "confirm" | "lookup", string>>;

/**
 * The demo sign-in (AC 59, 60): a full-screen cover over every page until someone signs in. Any username and
 * password are accepted. Rendered on the server so a first visit is covered from first paint; a remembered
 * sign-in hides it before paint (`data-auth="in"`), and the page behind is inert while it shows.
 */
export function LoginGate() {
  const signedIn = useSignedIn();
  const storedUser = useStoredUser();
  const storedRole = useStoredRole();
  const [view, setView] = useState<View>("signIn");
  const [typedUser, setTypedUser] = useState<string | null>(null);
  const [typedRole, setTypedRole] = useState<Role | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [lookup, setLookup] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstView = useRef(true);
  const panelRef = useRef<HTMLDivElement>(null);
  const wasSignedIn = useRef(false);
  const ids = { title: useId(), user: useId(), password: useId(), confirm: useId(), email: useId(), lookup: useId(), show: useId() };
  const username = typedUser ?? storedUser;
  const role = typedRole ?? storedRole;

  // The page behind cannot be reached while the cover shows. Signing out moves focus into the cover, to the
  // first empty field (the password, when the username is remembered).
  useEffect(() => {
    const shell = document.querySelector("[data-app-shell]");
    if (signedIn) {
      shell?.removeAttribute("inert");
      wasSignedIn.current = true;
      return;
    }
    shell?.setAttribute("inert", "");
    if (!wasSignedIn.current) return;
    wasSignedIn.current = false;
    const fields = [...(panelRef.current?.querySelectorAll<HTMLInputElement>("input[autocomplete]") ?? [])];
    (fields.find((field) => field.value === "") ?? fields[0])?.focus();
  }, [signedIn]);

  // Moving between sign in, create account and reset: focus goes to the new heading so it is announced.
  useEffect(() => {
    if (firstView.current) {
      firstView.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [view]);

  function go(next: View) {
    setErrors({});
    setPassword("");
    setConfirm("");
    setView(next);
  }

  function finish() {
    notifyAuth();
    setTypedUser(null);
    setTypedRole(null);
    setPassword("");
    setConfirm("");
    setEmail("");
    setErrors({});
    setView("signIn");
  }

  function onSignIn(event: FormEvent) {
    event.preventDefault();
    const found: Errors = {};
    if (username.trim() === "") found.username = AUTH.missingUsername;
    if (password === "") found.password = AUTH.missingPassword;
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    if (signIn(username, password, role, document.documentElement, authStorage())) finish();
  }

  function onRegister(event: FormEvent) {
    event.preventDefault();
    const found: Errors = {};
    if (username.trim() === "") found.username = AUTH.missingUsername;
    if (password === "") found.password = AUTH.missingPassword;
    else if (confirm !== password) found.confirm = AUTH.passwordsDiffer;
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    if (register({ username, email, role }, password, document.documentElement, authStorage())) finish();
  }

  function onForgot(event: FormEvent) {
    event.preventDefault();
    if (lookup.trim() === "") {
      setErrors({ lookup: AUTH.missingUsernameOrEmail });
      return;
    }
    go("resetSent");
  }

  const usernameField = (
    <Field id={ids.user} label={AUTH.username} error={errors.username}>
      <input
        id={ids.user}
        className={dialogStyles.control}
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={40}
        value={username}
        onChange={(event) => setTypedUser(event.target.value)}
        aria-invalid={errors.username ? true : undefined}
        aria-describedby={errors.username ? `${ids.user}-error` : undefined}
        autoFocus={view === "signIn" && !signedIn && username === ""}
      />
    </Field>
  );

  const passwordField = (autoComplete: "current-password" | "new-password") => (
    <Field id={ids.password} label={AUTH.password} error={errors.password}>
      <input
        id={ids.password}
        className={dialogStyles.control}
        type={showPassword ? "text" : "password"}
        autoComplete={autoComplete}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        aria-invalid={errors.password ? true : undefined}
        aria-describedby={errors.password ? `${ids.password}-error` : undefined}
        autoFocus={view === "signIn" && !signedIn && username !== ""}
      />
    </Field>
  );

  const showToggle = (
    <label className={styles.loginCheck} htmlFor={ids.show}>
      <input id={ids.show} type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} />
      <span className={styles.loginCheckBox} aria-hidden="true" />
      {AUTH.showPassword}
    </label>
  );

  const roleField = (
    <fieldset className={styles.loginRoles}>
      <legend className={dialogStyles.label}>{AUTH.role}</legend>
      <div className={styles.loginRoleOptions}>
        {ROLES.map((choice) => (
          <label key={choice} className={styles.loginRole}>
            <input type="radio" name={`${ids.title}-role`} value={choice} checked={role === choice} onChange={() => setTypedRole(choice)} />
            <span>{AUTH.roles[choice]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );

  return (
    <div className={styles.loginGate} data-login-gate="" hidden={signedIn}>
      <div ref={panelRef} className={styles.loginPanel} role="dialog" aria-modal="true" aria-labelledby={ids.title}>
        <p className={styles.loginBrand} aria-hidden="true">
          {AUTH.brand}
        </p>
        {view === "signIn" ? (
          <>
            <h2 id={ids.title} ref={headingRef} tabIndex={-1} className={styles.loginTitle}>
              {AUTH.signInTitle}
            </h2>
            <p className={styles.loginIntro}>{AUTH.signInIntro}</p>
            <form className={dialogStyles.form} noValidate onSubmit={onSignIn}>
              {usernameField}
              {passwordField("current-password")}
              {showToggle}
              {roleField}
              <Button type="submit" className={`${styles.primary} ${styles.loginSubmit}`}>
                {AUTH.signIn}
              </Button>
            </form>
            <div className={styles.loginLinks}>
              <button type="button" className={styles.loginLink} onClick={() => go("forgot")}>
                {AUTH.forgot}
              </button>
              <p>
                {AUTH.newHere}{" "}
                <button type="button" className={styles.loginLink} onClick={() => go("register")}>
                  {AUTH.createAccount}
                </button>
              </p>
            </div>
          </>
        ) : null}
        {view === "register" ? (
          <>
            <h2 id={ids.title} ref={headingRef} tabIndex={-1} className={styles.loginTitle}>
              {AUTH.registerTitle}
            </h2>
            <p className={styles.loginIntro}>{AUTH.signInIntro}</p>
            <form className={dialogStyles.form} noValidate onSubmit={onRegister}>
              {usernameField}
              <Field id={ids.email} label={AUTH.email}>
                <input
                  id={ids.email}
                  className={dialogStyles.control}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Field>
              {roleField}
              {passwordField("new-password")}
              <Field id={ids.confirm} label={AUTH.confirmPassword} error={errors.confirm}>
                <input
                  id={ids.confirm}
                  className={dialogStyles.control}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(event) => setConfirm(event.target.value)}
                  aria-invalid={errors.confirm ? true : undefined}
                  aria-describedby={errors.confirm ? `${ids.confirm}-error` : undefined}
                />
              </Field>
              {showToggle}
              <Button type="submit" className={`${styles.primary} ${styles.loginSubmit}`}>
                {AUTH.create}
              </Button>
            </form>
            <p className={styles.loginLinks}>
              {AUTH.haveAccount}{" "}
              <button type="button" className={styles.loginLink} onClick={() => go("signIn")}>
                {AUTH.signIn}
              </button>
            </p>
          </>
        ) : null}
        {view === "forgot" ? (
          <>
            <h2 id={ids.title} ref={headingRef} tabIndex={-1} className={styles.loginTitle}>
              {AUTH.forgotTitle}
            </h2>
            <p className={styles.loginIntro}>{AUTH.forgotIntro}</p>
            <form className={dialogStyles.form} noValidate onSubmit={onForgot}>
              <Field id={ids.lookup} label={AUTH.usernameOrEmail} error={errors.lookup}>
                <input
                  id={ids.lookup}
                  className={dialogStyles.control}
                  autoComplete="username"
                  autoCapitalize="none"
                  value={lookup}
                  onChange={(event) => setLookup(event.target.value)}
                  aria-invalid={errors.lookup ? true : undefined}
                  aria-describedby={errors.lookup ? `${ids.lookup}-error` : undefined}
                />
              </Field>
              <Button type="submit" className={`${styles.primary} ${styles.loginSubmit}`}>
                {AUTH.sendReset}
              </Button>
            </form>
            <p className={styles.loginLinks}>
              <button type="button" className={styles.loginLink} onClick={() => go("signIn")}>
                {AUTH.backToSignIn}
              </button>
            </p>
          </>
        ) : null}
        {view === "resetSent" ? (
          <>
            <h2 id={ids.title} ref={headingRef} tabIndex={-1} className={styles.loginTitle}>
              {AUTH.forgotTitle}
            </h2>
            <p className={styles.loginIntro} role="status">
              {AUTH.resetSent}
            </p>
            <Button type="button" className={`${styles.primary} ${styles.loginSubmit}`} onClick={() => go("signIn")}>
              {AUTH.backToSignIn}
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className={dialogStyles.field}>
      <label className={dialogStyles.label} htmlFor={id}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className={dialogStyles.fieldError} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
