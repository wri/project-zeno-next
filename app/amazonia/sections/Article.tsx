import { Box, Text } from "@chakra-ui/react";
import SectionEyebrow from "./SectionEyebrow";
import ExampleCards from "./ExampleCards";
import { PAGE_MAX_W, ARTICLE_MAX_W } from "./widths";

const bodyTextProps = {
  m: 0,
  mb: "22px",
  fontSize: "18px",
  lineHeight: "1.72",
  color: "neutral.700",
};

export default function Article() {
  return (
    <Box as="section" maxW={PAGE_MAX_W} mx="auto" px={{ base: 6, md: 8 }}>
      <Box as="article" maxW={ARTICLE_MAX_W} mx="auto" pt="64px">
        <Text {...bodyTextProps}>
          In Ecuador&rsquo;s Yasuní Biosphere Reserve, scientists have
          documented a steep decline in insect-eating birds, even in forests
          that appear protected and intact. Are similar declines happening
          elsewhere? Are other species affected? And what is driving the change?
        </Text>
        <Text {...bodyTextProps}>
          The Amazon is one of the most biodiverse regions on Earth, home to
          jaguars, monkeys, macaws, millions of insects and countless other
          species. Yet the people working to understand, manage and conserve the
          region lack timely information about how wildlife and ecosystems are
          changing. While biodiversity monitoring has traditionally relied on
          localized research projects and site-specific studies, these efforts
          often use different methodologies, cover limited areas and depend on
          short-term funding. As a result, decision-makers rarely have a
          complete or timely picture of wildlife trends and ecosystem health
          across the Amazon.
        </Text>

        <SectionEyebrow
          eyebrow="The opportunity"
          heading="A new opportunity for biodiversity monitoring"
        />
        <Text {...bodyTextProps}>
          Recent advances in technology have created new opportunities to
          understand nature at unprecedented scales. Earth observation systems,
          camera traps, bioacoustic sensors and environmental DNA (eDNA) can
          generate more information about ecosystems than ever before. Improved
          connectivity and cloud computing make it possible to collect and
          analyze data from even the most remote locations in near-real-time.
        </Text>
        <Text {...bodyTextProps}>
          At the same time, advances in AI are making it possible to bring these
          different sources of information together. By combining satellite
          observations with data collected on the ground, AI can help reveal
          patterns, trends and changes that would be impossible to detect from
          any single data source alone. Meanwhile, Amazonian conservation
          organizations, research institutes and Indigenous and rural
          communities are increasingly well-positioned to lead and manage these
          systems.
        </Text>

        <SectionEyebrow
          eyebrow="The system"
          heading="Making biodiversity intelligence actionable"
        />
        <Text {...bodyTextProps}>
          Amazon.ia is building a Pan-Amazonian biodiversity observatory and
          intelligence system designed to generate actionable biodiversity
          intelligence across the biome. The project will connect a network of
          monitoring sites across diverse ecosystems and combine data from
          satellites, camera traps, acoustic sensors and eDNA into a shared
          analytical framework. Rather than simply collecting more data,
          Amazon.ia aims to transform available information into insights that
          support real-world decisions — for example:
        </Text>
      </Box>

      <Box mt="8px">
        <ExampleCards />
      </Box>

      <Box as="article" maxW={ARTICLE_MAX_W} mx="auto" pt="32px">
        <Text {...bodyTextProps}>
          By building locally owned infrastructure, analytical capacity and
          decision-support tools, Amazon.ia aims to make biodiversity
          intelligence as accessible and actionable as forest monitoring is
          today — helping governments, Indigenous and rural communities,
          researchers, conservation organizations and other stakeholders across
          the Amazon better understand, manage and protect one of the
          world&rsquo;s most important ecosystems and its wildlife.
        </Text>

        <SectionEyebrow
          eyebrow="Open access"
          heading="Open access through Global Nature Watch"
        />
        <Text {...bodyTextProps} mb="8px">
          Amazon.ia&rsquo;s data and insights will be available through Global
          Nature Watch (GNW) as part of our mission to provide open access to
          the best available data and tools to help people everywhere protect
          and restore nature. The data and insights will be openly accessible on
          Horizon, GNW&rsquo;s AI-driven platform currently in preview.
        </Text>
      </Box>
    </Box>
  );
}
