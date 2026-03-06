import { View, Text } from "@react-pdf/renderer";
import styles from "./pdfStyles";

interface Props {
  content: string;
}

/**
 * Renders a text block's content as @react-pdf/renderer primitives.
 *
 * Splits on double-newlines for paragraph spacing and preserves single
 * newlines as line breaks within a paragraph.
 */
export default function PdfTextBlock({ content }: Props) {
  if (!content) return null;

  const paragraphs = content.split(/\n\n+/);

  return (
    <View style={styles.textBlock}>
      {paragraphs.map((para, i) => (
        <Text key={i} style={styles.textParagraph}>
          {para}
        </Text>
      ))}
    </View>
  );
}
