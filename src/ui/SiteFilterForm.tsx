import Link from "next/link";
import dialogStyles from "./decisions/decisions.module.css";
import { SITE_FILTER } from "./messages";
import { READINESS_FILTERS, SEARCH_MAX, type SiteFilters } from "./site-filters";
import styles from "./primitives.module.css";

/**
 * The projects filter (AC 72, 73), after qantum-stock's work-package list: Search, Readiness, Apply and Reset. A GET
 * form, so it works without JavaScript and the choice stays in the URL. The page keys it by the filters, so Reset
 * (a client navigation) starts it afresh instead of keeping what was typed.
 */
export function SiteFilterForm({ filters }: { filters: SiteFilters }) {
  return (
    <form action="/sites" method="get" aria-label={SITE_FILTER.label} className={styles.siteFilter}>
      <div className={dialogStyles.field}>
        <label className={dialogStyles.label} htmlFor="site-filter-q">
          {SITE_FILTER.search}
        </label>
        <input
          id="site-filter-q"
          className={dialogStyles.control}
          type="search"
          name="q"
          defaultValue={filters.query}
          maxLength={SEARCH_MAX}
          placeholder={SITE_FILTER.searchPlaceholder}
        />
      </div>
      <div className={dialogStyles.field}>
        <label className={dialogStyles.label} htmlFor="site-filter-status">
          {SITE_FILTER.readiness}
        </label>
        <select id="site-filter-status" className={dialogStyles.control} name="status" defaultValue={filters.status}>
          {READINESS_FILTERS.map((filter) => (
            <option key={filter} value={filter}>
              {SITE_FILTER.options[filter]}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.siteFilterActions}>
        <button type="submit" className={`${styles.button} ${styles.primary}`}>
          {SITE_FILTER.apply}
        </button>
        <Link className={styles.button} href="/sites">
          {SITE_FILTER.reset}
        </Link>
      </div>
    </form>
  );
}
