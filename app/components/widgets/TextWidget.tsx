import { Box } from "@chakra-ui/react";
import Markdown from "react-markdown";

interface TextWidgetProps {
  data: string;
}

export default function TextWidget({ data }: TextWidgetProps) {
  return (
    <Box p="6">
      <Markdown>{data}</Markdown>
    </Box>
  );
}



