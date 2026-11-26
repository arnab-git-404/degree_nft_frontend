// Pages are opened by permission, never by role name (custom roles can have any name).
export const INSTITUTION_DESK_PERMISSIONS = ["credential:create", "batch:upload", "student:read"];
export const STUDENT_DESK_PERMISSIONS = ["credential:read", "credential:confirm", "report:create"];

// Colleges the user can work in (the API already returns only ACTIVE memberships).
export const getActiveMemberships = (user) =>
  (user?.memberships || []).filter(
    (membership) =>
      membership.institutionId?.status === "ACTIVE" && membership.roleId?.isActive !== false
  );

// Colleges where the user is a member but the role has been made inactive: their access there is revoked.
export const getRevokedMemberships = (user) =>
  (user?.memberships || []).filter(
    (membership) =>
      membership.institutionId?.status === "ACTIVE" && membership.roleId?.isActive === false
  );

// Account role permissions plus those of every active college membership. UI only: the backend
// checks college permissions against the selected college's membership on each request.
export const getPermissions = (user) => {
  if (!user || typeof user === "string") return [];

  return [
    ...(user.roleId?.permissions || []),
    ...getActiveMemberships(user).flatMap((membership) => membership.roleId?.permissions || []),
  ];
};

const hasAny = (user, required) => {
  const permissions = getPermissions(user);
  return permissions.includes("*") || required.some((key) => permissions.includes(key));
};

// The working desk for this user, or null when they have neither.
export const getDeskPath = (user) => {
  if (hasAny(user, INSTITUTION_DESK_PERMISSIONS)) return "/institution";
  if (hasAny(user, STUDENT_DESK_PERMISSIONS)) return "/student";
  return null;
};

export const getHomePath = (user) => {
  if (hasAny(user, ["platform:manage"])) return "/admin";
  return getDeskPath(user) || "/profile";
};
