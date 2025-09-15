"use client";

import { useState, useEffect } from "react";
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

const SAMPLE_PROMPTS = [
  "Tell me about wild fires in the Brazilian Amazon Rainforest",
  "What are the latest deforestation trends in Indonesia?",
  "How is climate change affecting biodiversity in the Amazon?",
  "Show me recent land use changes in the Congo Basin",
  "What country's forests sequester the most carbon?",
  "Where are the most disturbances to nature happening now?",
  "Show me high priority areas in my monitoring portfolio",
];

export default function LandingPage() {
  const [promptIndex, setPromptIndex] = useState(0);
  const { prompts, fetchPrompts } = usePromptStore();
  useEffect(() => {
    fetchPrompts();
  }, []);
  return (
    <>
      <LandingHero
        prompts={SAMPLE_PROMPTS}
        promptIndex={promptIndex}
        setPromptIndex={setPromptIndex}
      />
      <PromptMarquee
        prompts={prompts}
        promptIndex={promptIndex}
        setPromptIndex={setPromptIndex}
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
