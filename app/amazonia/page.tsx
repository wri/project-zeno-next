import FooterSection from "@/app/(home)/sections/footer/Footer";
import { useDocumentTitle } from "@/app/hooks/useDocumentTitle";
import Hero from "./sections/Hero";
import Lead from "./sections/Lead";
import Article from "./sections/Article";
import Partners from "./sections/Partners";

export default function AmazoniaPage() {
  // Set client-side, so crawlers and link previews still see index.html's
  // generic title/description until this route is prerendered.
  useDocumentTitle("Amazon.ia | Global Nature Watch Horizon");

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
