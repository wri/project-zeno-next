import { ImageryCard } from "@/app/components/ImageryCard";
import type { ImageryCardData } from "@/app/utils/imagery";

interface ImageryCardWidgetProps {
  imagery: ImageryCardData;
}

export default function ImageryCardWidget({ imagery }: ImageryCardWidgetProps) {
  return <ImageryCard imagery={imagery} />;
}
