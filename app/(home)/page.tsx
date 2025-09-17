"use client";

import { useState } from "react";
import { usePromptStore } from "@/app/store/promptStore";
import LandingHero from "./sections/1_Hero";
import PromptMarquee from "./sections/2_PromptMarquee";
import FeaturesTabsSection from "./sections/4_FeaturesTabs";
import SupportWorkTabsSection from "./sections/5_SupportWorkTabs";
import HowItWorksSection from "./sections/6_HowItWorks";
import LatestUpdatesSection from "./sections/7_LatestUpdates";
import FutureOfMonitoringSection from "./sections/8_FutureOfMonitoring";
import TeamSection from "./sections/9_TeamSection";
import CTASection from "./sections/11_CTA";
import FooterSection from "./sections/12_Footer";

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
