import { Tag } from "@chakra-ui/react";
import { ChatContextOptions, ChatContextType } from "./ContextButton";

interface ContextTagProps {
  contextType?: ChatContextType;
  content?: string;
  closeable?: boolean;
}

function ContextTag({
  contextType = "area",
  content = "Beirut, Lebanon",
  closeable = false,
}: ContextTagProps) {
  return (
    <Tag.Root
      variant="solid"
      bg="bg"
      color="fg.muted"
      borderWidth={closeable ? "1px" : "none"}
      borderColor={closeable ? "border" : "transparent"}
    >
      <Tag.StartElement>{ChatContextOptions[contextType].icon}</Tag.StartElement>
      <Tag.Label>{content}</Tag.Label>
      {closeable && (
        <Tag.EndElement>
          <Tag.CloseTrigger />
        </Tag.EndElement>
      )}
    </Tag.Root>
  );
}
export default ContextTag;
