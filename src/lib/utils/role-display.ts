export function getRoleDisplay(role: string | null | undefined): {
  crown: string | null;
  nameClass: string;
} {
  switch (role) {
    case "master":
      return {
        crown: "👑",
        nameClass: "text-amber-300 font-semibold",
      };
    case "moderator":
      return {
        crown: "🛡️",
        nameClass: "text-blue-300 font-semibold",
      };
    default:
      return {
        crown: null,
        nameClass: "text-zinc-100",
      };
  }
}
