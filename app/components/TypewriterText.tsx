import { useEffect, useState } from "react";

interface TypewriterTextProps {
  text: string;
  speed?: number;
  render?: (text: string) => React.ReactNode;
  onDone?: () => void;
  skipAnimation?: boolean;
}

export default function TypewriterText({ text, speed = 10, render, onDone, skipAnimation = false }: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    if (skipAnimation) {
      setDisplayed(text);
      if (onDone) onDone();
      return;
    }

    setDisplayed("");
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i === text.length) {
        clearInterval(interval);
        if (onDone) onDone();
      }
    }, speed);
    return () => {
      clearInterval(interval);
    };
  }, [text, speed, onDone, skipAnimation]);

  return (
    <>
      {render ? render(displayed) : <span>{displayed}</span>}
    </>
  );
}