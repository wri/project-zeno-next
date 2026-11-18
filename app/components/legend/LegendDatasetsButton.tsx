import ContextButton from "@/app/components/ContextButton";
import useSidebarStore from "@/app/store/sidebarStore";

/**
 * The composer's Datasets button, sized for the legend header. Both toggle
 * and reflect the same `sidebarStore.dataCatalogOpen`, so they light up
 * together.
 */
export function LegendDatasetsButton() {
  const dataCatalogOpen = useSidebarStore((s) => s.dataCatalogOpen);
  const toggleDataCatalog = useSidebarStore((s) => s.toggleDataCatalog);

  return (
    <ContextButton
      contextType="layer"
      onClick={toggleDataCatalog}
      active={dataCatalogOpen}
      bg="#FFFFFF"
      h="20px"
      px="6px"
      fontSize="11px"
    />
  );
}
