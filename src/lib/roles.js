export const getRoleName = (user) => {
  if (!user) return null;
  if (typeof user === "string") return user;

  return user.roleId?.name || null;
};

export const getPermissions = (user) => {
  if (!user || typeof user === "string") return [];

  return user.roleId?.permissions || [];
};

export const getHomePath = (user) => {
  const role = getRoleName(user);
  const permissions = getPermissions(user);
  const has = (permission) =>
    permissions.includes("*") || permissions.includes(permission);

  if (role === "admin") return "/admin";
  if (role === "university") return "/university";
  if (role === "student") return "/student";

  if (
    has("nft:create") ||
    has("batch:upload") ||
    has("student:read")
  ) {
    return "/university";
  }

  if (has("nft:read") || has("nft:confirm") || has("report:create")) {
    return "/student";
  }

  return "/profile";
};
