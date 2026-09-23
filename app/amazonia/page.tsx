import { useEffect } from "react";
import FooterSection from "@/app/(home)/sections/footer/Footer";
import Hero from "./sections/Hero";
import Lead from "./sections/Lead";
import Article from "./sections/Article";
import Partners from "./sections/Partners";

export default function AmazoniaPage() {
  // ponytail: set client-side, so crawlers and link previews still see
  // index.html's generic title/description; prerender this route if that matters.
  useEffect(() => {
    const previous = document.title;
    document.title = "Amazon.ia | Global Nature Watch Horizon";
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <>
      <Hero />
      <Lead />
      <Article />
      <Partners />
      <FooterSection />
    </>
  );
}
