// Pages are opened by permission, never by role name (custom roles can have any name).
export const UNIVERSITY_DESK_PERMISSIONS = ["nft:create", "batch:upload", "student:read"];
export const STUDENT_DESK_PERMISSIONS = ["nft:read", "nft:confirm", "report:create"];

export const getPermissions = (user) => {
  if (!user || typeof user === "string") return [];

  return user.roleId?.permissions || [];
};

const hasAny = (user, required) => {
  const permissions = getPermissions(user);
  return permissions.includes("*") || required.some((key) => permissions.includes(key));
};

// The working desk for this user, or null when they have neither.
export const getDeskPath = (user) => {
  if (hasAny(user, UNIVERSITY_DESK_PERMISSIONS)) return "/university";
  if (hasAny(user, STUDENT_DESK_PERMISSIONS)) return "/student";
  return null;
};

export const getHomePath = (user) => {
  if (hasAny(user, ["platform:manage"])) return "/admin";
  return getDeskPath(user) || "/profile";
};
