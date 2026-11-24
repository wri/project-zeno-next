/**
 * Public API of the `user-aoi` entity (FSD slice).
 *
 * The user's area library ("My areas"): custom areas they own and source
 * areas they saved by reference. Consumers import ONLY from this barrel.
 */
export { UserAoiSchema, type UserAoi } from "./model/user-aoi";
export { isInLibrary, userAoiToAoi } from "./lib/user-aoi";
export { fetchUserAois } from "./api/fetch-user-aois";
export {
  USER_AOIS_QUERY_KEY,
  useDeleteUserAoi,
  useRenameUserAoi,
  useSaveUserAoi,
  useUserAois,
  useUserAoisSuspense,
  type SourceAreaRef,
} from "./api/use-user-aois";
