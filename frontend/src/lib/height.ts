// Heights are stored in cm; the UI shows feet & inches.
export const cmToFtIn = (cm: number) => {
  const total = Math.round(cm / 2.54);
  return { ft: Math.floor(total / 12), inch: total % 12 };
};
export const ftInToCm = (ft: number, inch: number) => Math.round((ft * 12 + inch) * 2.54);
export const fmtFtIn = (cm: number) => {
  const { ft, inch } = cmToFtIn(cm);
  return `${ft}'${inch}"`;
};
export const fmtHeight = (cm: number | string | null | undefined) =>
  cm ? `${fmtFtIn(Number(cm))} (${cm} cm)` : "";

export const FEET = ["4", "5", "6", "7"];
export const INCHES = Array.from({ length: 12 }, (_, i) => String(i));

// Preferred-height dropdowns: 4'0" to 7'0" in 1-inch steps; the value is the cm figure the API stores.
export const HEIGHT_RANGE_OPTIONS = Array.from({ length: 12 * 3 + 1 }, (_, i) => {
  const cm = ftInToCm(4, i);
  return { value: String(cm), label: fmtFtIn(cm) };
});
