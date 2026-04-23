"use client";

import { useState } from "react";
import { usePromptStore } from "@/app/store/promptStore";
import LandingHero from "./sections/hero/Hero";
import PromptMarquee from "./sections/hero/PromptMarquee";
import FeaturesTabsSection from "./sections/features/FeaturesTabs";
import SupportWorkTabsSection from "./sections/features/SupportWorkTabs";
import HowItWorksSection from "./sections/features/HowItWorks";
import LatestUpdatesSection from "./sections/footer/LatestUpdates";
import FutureOfMonitoringSection from "./sections/about/FutureOfMonitoring";
import TeamSection from "./sections/about/TeamSection";
import CTASection from "./sections/footer/CTA";
import FooterSection from "./sections/footer/Footer";

export default function LandingPage() {
  const [promptIndex, setPromptIndex] = useState(0);
  const { prompts } = usePromptStore();
  
  return (
    <>
      <LandingHero
        prompts={prompts}
        promptIndex={promptIndex}
        setPromptIndex={setPromptIndex}
      />
      <PromptMarquee
        prompts={prompts}
      />
      <FeaturesTabsSection />
      <SupportWorkTabsSection />
      <HowItWorksSection />
      <LatestUpdatesSection />
      <FutureOfMonitoringSection />
      <TeamSection />
      <CTASection />
      <FooterSection />
    </>
  );
}
