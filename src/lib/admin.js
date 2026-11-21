export const formatDate = (value) =>
  value ? new Date(value).toLocaleString() : "—";

export function statusTone(value) {
  if (value === "VERIFIED" || value === "MINTED" || value === true) {
    return "success";
  }

  if (value === "REJECTED" || value === false) {
    return "danger";
  }

  return "warning";
}

// An academic session as colleges write it: "2024-25", or "2024" for a calendar year.
export const sessionLabel = ({ startYear, endYear }) =>
  endYear === startYear ? String(startYear) : `${startYear}-${String(endYear).slice(-2)}`;

// Default colours the server gives a new record; the forms preview them as the "Auto" swatch.
// Mirror of degree_nft_backend/utils/color.js (colorFromSeed, hashString); keep both in sync.
export function colorFromSeed(seed) {
  const hue = (seed * 137.508) % 360;
  const [s, l] = [0.65, 0.5];
  const a = s * Math.min(l, 1 - l);
  const channel = (n) => {
    const k = (n + hue / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}
const hashString = (text) => [...String(text)].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7);

export const yearColor = colorFromSeed;
// Programs are coloured from their (uppercased) code.
export const codeColor = (code) => colorFromSeed(hashString(String(code).trim().toUpperCase()));

// A batch's name, code and colour, computed the way the server does for batches saved before those fields existed.
export const batchView = (batch, program) => {
  const code = batch.code ?? `${program?.code}-${batch.startYear}`;
  return {
    code,
    name: batch.name ?? `${program?.code} ${batch.startYear}–${batch.endYear}`,
    color: batch.color ?? codeColor(code),
  };
};

export const ENROLLMENT_STATUSES = {
  ENROLLED: { label: "Enrolled", tone: "info" },
  COMPLETED: { label: "Completed", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

// "CSE 2022–26" for an enrollment whose program and batch are populated.
export const enrollmentLabel = (enrollment) =>
  `${enrollment.programId?.code} ${enrollment.programSessionId?.startYear}–${String(enrollment.programSessionId?.endYear).slice(-2)}`;
