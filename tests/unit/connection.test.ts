import { describe, expect, it } from "vitest";
import {
  clockLabel,
  connectionDescription,
  connectionState,
  lastSyncedLine,
  offlineBannerText,
  parseHealth,
  parseStoredTime,
  pickerLine,
  updatedLine,
} from "@/ui/connection";

// Local times, so the labels read the same in any time zone the tests run in.
const now = new Date(2026, 9, 18, 14, 32).getTime();
const at = (day: number, hours: number, minutes: number) => new Date(2026, 9, day, hours, minutes).getTime();

describe("AC 48: online needs the network, an answered check, and Online left on", () => {
  const answered = { browserOnline: true, workOffline: false, lastOkAt: at(18, 14, 30), lastFailAt: null };

  it("is online only when all three hold", () => {
    expect(connectionState(answered)).toBe("online");
    expect(connectionState({ ...answered, browserOnline: false })).toBe("offline");
    expect(connectionState({ ...answered, workOffline: true })).toBe("offline");
  });

  it("says checking before the first answer, never online", () => {
    expect(connectionState({ ...answered, lastOkAt: null })).toBe("checking");
    expect(connectionState({ ...answered, lastOkAt: null, lastFailAt: at(18, 14, 31) })).toBe("offline");
  });

  it("a failed check after the last answer is offline, and a later answer is online again", () => {
    expect(connectionState({ ...answered, lastFailAt: at(18, 14, 31) })).toBe("offline");
    expect(connectionState({ ...answered, lastFailAt: answered.lastOkAt })).toBe("offline");
    expect(connectionState({ ...answered, lastFailAt: at(18, 14, 29) })).toBe("online");
  });
});

describe("AC 48: times read as the phone's clock", () => {
  it("shows the time today, yesterday with the word, and older with the date", () => {
    expect(clockLabel(at(18, 8, 2), now)).toBe("08:02");
    expect(clockLabel(at(17, 17, 40), now)).toBe("yesterday 17:40");
    expect(clockLabel(at(3, 21, 0), now)).toBe("3 Oct, 21:00");
  });

  it("never invents a time for missing or unreadable input", () => {
    expect(clockLabel(null, now)).toBeNull();
    expect(clockLabel(undefined, now)).toBeNull();
    expect(clockLabel("not a date", now)).toBeNull();
    expect(clockLabel(at(18, 8, 2), Number.NaN)).toBeNull();
  });

  it("names the picker's last action, or says it is unknown", () => {
    expect(pickerLine(new Date(at(18, 7, 40)).toISOString(), now)).toBe("Picker last action · 07:40");
    expect(pickerLine(null, now)).toBe("Picker last action · unknown");
    expect(pickerLine("garbage", now)).toBe("Picker last action · unknown");
  });

  it("says when the phone last heard from the server", () => {
    expect(updatedLine(at(18, 8, 2), now)).toBe("Updated 08:02");
    expect(updatedLine(null, now)).toBe("Not updated yet");
    expect(offlineBannerText(at(18, 8, 2), now)).toBe("You're offline. You're seeing data from 08:02. Don't treat it as current.");
    expect(offlineBannerText(null, now)).toBe("You're offline. Nothing on this screen has been confirmed yet.");
  });

  it("describes the switch state for a screen reader", () => {
    expect(connectionDescription("online", at(18, 8, 2), now, false)).toBe("Network online");
    expect(connectionDescription("checking", null, now, false)).toBe("Checking the connection");
    expect(connectionDescription("offline", at(18, 8, 2), now, false)).toBe("Network offline, last updated 08:02");
    expect(connectionDescription("offline", null, now, true)).toBe("Working offline by choice, not updated yet");
  });

  it("shows the last sync time, and reads junk storage as never synced", () => {
    expect(lastSyncedLine(at(18, 14, 32), now)).toBe("Last synced 14:32");
    expect(lastSyncedLine(null, now)).toBe("Not synced on this phone yet");
    expect(parseStoredTime(String(at(18, 14, 32)))).toBe(at(18, 14, 32));
    for (const junk of [null, "", "  ", "abc", "-5", "0", "Infinity"]) expect(parseStoredTime(junk)).toBeNull();
  });
});

describe("AC 48: the health answer", () => {
  it("accepts only status ok, and keeps the stock time only when it is a real time", () => {
    expect(parseHealth({ status: "ok", stockAsOf: "2026-10-03T08:00:00Z" })).toEqual({ stockAsOf: "2026-10-03T08:00:00Z" });
    expect(parseHealth({ status: "ok", stockAsOf: null })).toEqual({ stockAsOf: null });
    expect(parseHealth({ status: "ok", stockAsOf: "soon" })).toEqual({ stockAsOf: null });
    for (const bad of [null, "ok", 1, {}, { status: "down" }, { code: "internal_error" }]) expect(parseHealth(bad)).toBeNull();
  });
});
