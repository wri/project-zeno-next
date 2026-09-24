/**
 * The new-dashboard screen's confirmation after an area upload. Uploading
 * never creates a dashboard: the areas land in the picker list for the user
 * to pick from. (Whether a single area should open a dashboard straight away
 * is an open product question; that change belongs in the screen's upload
 * handler, next to where this is called.)
 */
export function uploadedAreasToast(areas: Array<{ name: string }>): {
  title: string;
  description: string;
} {
  if (areas.length === 1) {
    return {
      title: "Area uploaded",
      description: `"${areas[0].name}" is ready to use.`,
    };
  }
  return {
    title: `${areas.length} areas created`,
    description: "Pick one below to create a dashboard.",
  };
}
