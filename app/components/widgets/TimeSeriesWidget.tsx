import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Box, Flex, Text } from "@chakra-ui/react";
import Markdown from "react-markdown";

interface TimeSeriesDataPoint {
  year: number;
  [key: string]: number;
}

interface TimeSeriesWidgetProps {
  data: TimeSeriesDataPoint[];
  xlabel?: string;
  ylabel?: string;
  title?: string;
  description?: string;
  analysis?: string;
}

export default function TimeSeriesWidget({ data, xlabel, ylabel, title, description, analysis }: TimeSeriesWidgetProps) {
  const chartRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const colors = d3.schemeCategory10; // Use D3's color scheme
  const [chartDimensions, setChartDimensions] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    if (containerRef.current) {
      const observer = new ResizeObserver(entries => {
        const e = entries[0];
        const parentElement = e.target.parentElement;
        if (parentElement) {
          const maxHeight = 600; // Maximum height in pixels
          const newDimensions: [number, number] = [
            parentElement.clientWidth - 32,
            Math.min((parentElement.clientHeight * 0.75) - 40, maxHeight)
          ];
          setChartDimensions(newDimensions);
        }
      });
      observer.observe(containerRef.current);

      return () => {
        observer.disconnect();
      };
    }
  }, [containerRef]);

  // If every value in the rest of the keys is null, exclude the object.
  // eslint-disable-next-line no-unused-vars
  const filteredData = data.filter(({ year, ...rest }) =>
    !Object.values(rest).every(value => Number.isNaN(value))
  );

  useEffect(() => {
    // Exit effect if at least one dimension is 0
    if (!chartDimensions.every((x) => !!x) || !data) return;

    const width = chartDimensions[0];
    const height = chartDimensions[1];
    const margin = { top: 20, right: 100, bottom: 40, left: 60 };

    d3.select(chartRef.current).selectAll("*").remove();
    const svg = d3.select(chartRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const keys = Object.keys(data[0]).filter(key => key !== "year");
    const colorScale = d3.scaleOrdinal().domain(keys).range(colors);

    const x = d3.scaleLinear()
      .domain(d3.extent(filteredData, d => d.year) as [number, number])
      .range([0, width - margin.left - margin.right]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(filteredData.flatMap(d => keys.map(key => d[key])).filter(v => typeof v === "number")) as number])
      .nice()
      .range([height - margin.top - margin.bottom, 0]);

    const line = d3.line<{ year: number; value: number }>()
      .x(d => x(d.year))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX);

    keys.forEach((key) => {
      const lineData = filteredData.map(d => ({ year: d.year, value: isNaN(d[key]) ? 0 : d[key] }));

      svg.append("path")
        .datum(lineData)
        .attr("fill", "none")
        .attr("stroke", colorScale(key) as string)
        .attr("stroke-width", 2)
        .attr("d", line);
    });

    svg.append("g")
      .attr("transform", `translate(0,${height - margin.top - margin.bottom})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("d")));

    const customTickFormat = (d: d3.NumberValue) => {
      // For small numbers, show as full numbers (no abbreviation)
      if (Math.abs(+d) < 1000) return d3.format("~f")(+d);
      // For larger numbers, use SI notation (e.g., 1k, 1M)
      return d3.format(".2s")(+d);
    };

    svg.append("g")
      .call(d3.axisLeft(y).tickFormat(customTickFormat))
      .style("font-size", "0.8em");

    if (ylabel) {
      svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left)
        .attr("x", -((height - margin.top - margin.bottom) / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text(ylabel);
    }

    if (xlabel) {
      svg.append("text")
        .attr("y", height - margin.top - margin.bottom + 20)
        .attr("x", (width - margin.left - margin.right) / 2)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text(xlabel);
    }

    // Cursor, Tooltip, and Dashed Line
    const tooltip = d3.select(tooltipRef.current)
      .style("position", "absolute")
      .style("background", "var(--chakra-colors-bg)")
      .style("padding", "8px")
      .style("border", "1px solid var(--chakra-colors-border)")
      .style("border-radius", "4px")
      .style("display", "none");

    const cursorLine = svg.append("line")
      .attr("stroke", "black")
      .attr("stroke-dasharray", "4")
      .attr("y1", 0)
      .attr("y2", height - margin.top - margin.bottom)
      .style("display", "none");

    const formatTooltipValue = (v: any) => typeof v === "number" ? d3.format(",.0f")(v) : v;

    svg.append("rect")
      .attr("width", width - margin.left - margin.right)
      .attr("height", height - margin.top - margin.bottom)
      .attr("fill", "transparent")
      .on("mousemove", function (event) {
        const [mouseX] = d3.pointer(event);
        const year = Math.round(x.invert(mouseX));
        const yearData = filteredData.find(d => d.year === year);
        if (yearData) {
          cursorLine.style("display", "block")
            .attr("x1", x(year))
            .attr("x2", x(year));

          if (containerRef.current) {
            const containerBounds = containerRef.current.getBoundingClientRect();
            tooltip.style("display", "block")
              .style("left", `${event.clientX - containerBounds.left + 10}px`)
              .style("top", `${event.clientY - containerBounds.top + 10}px`);

            // Order keys highest to lowest based on value for the selected year
            const sortedKeys = keys.slice().sort((a, b) => (yearData[b] || 0) - (yearData[a] || 0));

            // Build tooltip HTML with legend colors and formatted values.
            const tooltipHTML = `<strong>Year: ${year}</strong><br>` +
              sortedKeys.map(key =>
                `<span style="display:inline-block;width:10px;height:10px;background-color:${colorScale(key)};margin-right:5px;"></span>` +
                `${key}: ${formatTooltipValue(yearData[key] || 0)}`
              ).join("<br>");
            tooltip.html(tooltipHTML);
          }
        }
      })
      .on("mouseout", () => {
        tooltip.style("display", "none");
        cursorLine.style("display", "none");
      });
  }, [data, colors, chartDimensions, filteredData, xlabel, ylabel]);

  return (
    <Box ref={containerRef} position="relative" p="6">
      <svg
        ref={chartRef}
        width={chartDimensions[0]}
        height={chartDimensions[1]}
      />
      <div ref={tooltipRef} />
      <Flex wrap="wrap" mt={2}>
        {Object.keys(filteredData[0]).filter(key => key !== "year").map((key, index) => (
          <Flex key={key} align="center" mr={4}>
            <Box w={4} h={4} bg={colors[index % colors.length]} mr={2} />
            <Text fontSize="xs">{key}</Text>
          </Flex>
        ))}
      </Flex>
      <Text mt={4}>{description}</Text>
      <Text mt={4} mb={2} fontWeight="bold">Insights</Text>
      <Markdown>{analysis}</Markdown>
    </Box>
  );
}
