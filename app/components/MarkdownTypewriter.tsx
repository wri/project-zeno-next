import React, { useEffect, useState } from "react";
import Markdown from "react-markdown";
import { ChatMessage } from "@/app/types/chat";

interface MarkdownTypewriterProps {
  message: ChatMessage;
  typingSpeed?: number;
}

function MarkdownTypewriter({ message, typingSpeed = 80 }: MarkdownTypewriterProps) {
  const [displayedText, setDisplayedText] = useState("");
  
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setDisplayedText(message.message.slice(0, index));
      index++;
      if (index > message.message.length) clearInterval(interval);
    }, typingSpeed);

    return () => clearInterval(interval);
  }, [message, typingSpeed]);

  return (
    <div className="prose dark:prose-invert">
      <Markdown>{displayedText}</Markdown>
    </div>
  );
}

export default MarkdownTypewriter;
