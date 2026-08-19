// The saved-leads download.
//
// A CSV is a file that gets opened in Excel or Google Sheets, and both of
// them treat a cell beginning with =, +, - or @ as a formula rather than
// as text. Business names come from Google Maps — i.e. from strangers —
// so "=cmd|'/c calc'!A1" as a shop name is a file that runs something on
// the reseller's machine when they open their own lead list. That is the
// only genuinely dangerous thing about this file and it is handled in one
// place, below, so it cannot be forgotten in a second one.

const COLUMNS = [
  ["name", "Business"],
  ["phone", "Phone"],
  ["address", "Address"],
  ["website", "Website"],
  ["has_website", "Has website"],
  ["category", "Searched for"],
  ["location", "Searched in"],
  ["maps_url", "Google Maps"],
  ["created_at", "Saved"],
];

// Prefixing with a single quote is what Excel and Sheets both read as
// "this is text" — the quote is not displayed in the cell.
function neutralize(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function cell(value) {
  const text = neutralize(value);
  // A quote inside a quoted field is escaped by doubling it (RFC 4180).
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Turns saved lead rows into CSV text. Never throws on odd rows — a
 * missing field is an empty cell, because a download that fails is worse
 * than a download with a gap in it.
 */
export function leadsToCsv(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const lines = [COLUMNS.map(([, header]) => cell(header)).join(",")];

  for (const row of list) {
    const r = row || {};
    lines.push(
      COLUMNS.map(([key]) => {
        if (key === "has_website") return cell(r.has_website ? "yes" : "no");
        if (key === "created_at") return cell(String(r.created_at || "").slice(0, 10));
        return cell(r[key]);
      }).join(",")
    );
  }

  // \r\n and a UTF-8 BOM: without the BOM, Excel on Windows renders an
  // accented business name as mojibake, which looks like our bug.
  return "﻿" + lines.join("\r\n") + "\r\n";
}

export function csvFilename(now = new Date()) {
  return `sitebric-leads-${now.toISOString().slice(0, 10)}.csv`;
}
