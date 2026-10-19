import { AUTH_SCRIPT } from "./auth";
import { THEME_SCRIPT } from "./theme";

/** The theme (AC 37) and the demo sign-in (AC 59), stamped on <html> before first paint. The layout keeps them in one inline script. */
export const HEAD_SCRIPT = `${THEME_SCRIPT}${AUTH_SCRIPT}`;
