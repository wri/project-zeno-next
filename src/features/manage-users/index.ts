/**
 * Public API of the `manage-users` feature (FSD slice): the user list, its
 * filtering and the user-type change for the superuser Manage Users page.
 */
export { filterUsers, type UserFilters } from "./lib/filter-users";
export type { ManagedUser } from "./lib/managed-user";
export { useAdminUsersList } from "./api/admin-users-list";
export { useAdminUserTypeUpdate } from "./api/admin-user-type-update";
