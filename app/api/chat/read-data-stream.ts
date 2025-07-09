export async function readDataStream({ abortController, reader, onData }: {
  abortController: AbortController;
  reader: ReadableStreamDefaultReader<Uint8Array>;
  onData: (data: string, isFinal: boolean) => void;
}) {
  // Process the simplified streaming response
  const utf8Decoder = new TextDecoder("utf-8");
  let { value: chunk, done: readerDone } = await reader.read();
  let decodedChunk = chunk ? utf8Decoder.decode(chunk, { stream: true }) : "";

  let buffer = ""; // Accumulate partial chunks

  while (!readerDone && !abortController.signal.aborted) {
    buffer += decodedChunk; // Append current chunk to buffer

    let lineBreakIndex;
    while ((lineBreakIndex = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, lineBreakIndex).trim(); // Extract the line
      buffer = buffer.slice(lineBreakIndex + 1); // Remove processed line

      if (line) {
        onData(line, false);
      }
    }

    // Read next chunk
    ({ value: chunk, done: readerDone } = await reader.read());
    decodedChunk = chunk ? utf8Decoder.decode(chunk, { stream: true }) : "";
  }

  // Handle any remaining data in the buffer
  if (buffer.trim() && !abortController.signal.aborted) {
    onData(buffer, true);
  }
}