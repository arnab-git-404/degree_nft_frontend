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
