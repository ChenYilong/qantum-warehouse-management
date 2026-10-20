import type { FitRow } from "./fit";
import { INVENTORY, type InventoryView } from "./inventory";
import { StatusChip } from "./StatusChip";
import { doesNotFit } from "./status";
import styles from "./primitives.module.css";

/**
 * Penetration and nominated solution side by side; a field that does not fit is marked with an icon and text (AC 36).
 * With `inventory` the table ends with the solution's stock: when it was counted and whether it is READY (AC 90).
 */
export function FitTable({ code, rows, inventory }: { code: string; rows: readonly FitRow[]; inventory?: InventoryView }) {
  return (
    <table className={styles.fitTable}>
      <thead>
        <tr>
          <th scope="col">
            <span className={styles.srOnly}>Field</span>
          </th>
          <th scope="col">Penetration</th>
          <th scope="col">{`Solution ${code}`}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th scope="row">{row.label}</th>
            <td>{row.penetration}</td>
            <td>
              {row.fits ? (
                row.solution
              ) : (
                <StatusChip status={doesNotFit(row.solution)} appearance="label" />
              )}
            </td>
          </tr>
        ))}
        {inventory ? (
          <>
            <tr data-inventory-captured="">
              <th scope="row">{INVENTORY.captured}</th>
              <td>—</td>
              <td>{inventory.capturedIso ? <time dateTime={inventory.capturedIso}>{inventory.captured}</time> : inventory.captured}</td>
            </tr>
            <tr data-inventory-status={inventory.status.label}>
              <th scope="row">{INVENTORY.status}</th>
              <td>—</td>
              <td>
                <StatusChip status={inventory.status} appearance="label" />
                <span className={styles.inventoryReason}>{inventory.reason}</span>
                {inventory.available ? <span className={styles.inventoryReason}>{inventory.available}</span> : null}
              </td>
            </tr>
          </>
        ) : null}
      </tbody>
    </table>
  );
}
