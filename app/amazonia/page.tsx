import FooterSection from "@/app/(home)/sections/footer/Footer";
import Hero from "./sections/Hero";
import Lead from "./sections/Lead";
import Article from "./sections/Article";
import Partners from "./sections/Partners";

export const metadata = {
  title: "Amazon.ia | Global Nature Watch Horizon",
  description:
    "Amazon.ia is a Pan-Amazonian biodiversity observatory and intelligence system, fusing satellite and ground sensor data to deliver actionable biodiversity intelligence across the Amazon.",
};

export default function AmazoniaPage() {
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
