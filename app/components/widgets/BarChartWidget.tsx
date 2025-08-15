import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Box, IconButton } from "@chakra-ui/react";
import { ChartBarIcon, ChartPieIcon } from "@phosphor-icons/react";

interface ChartData {
  categories: string[];
  values: number[];
  unit?: string;
}

interface ChartWidgetProps {
  data: ChartData;
}

export default function ChartWidget({ data }: ChartWidgetProps) {
  const chartRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");
  const [chartDimensions, setChartDimensions] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    if (containerRef.current) {
      const observer = new ResizeObserver(entries => {
        const e = entries[0];
        const parentElement = e.target.parentElement;
        if (parentElement) {
          const maxHeight = 600; // Maximum height in pixels
          const newDimensions: [number, number] = [
            parentElement.clientWidth - 60,
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

  useEffect(() => {
    // Exit effect if at least one dimension is 0
    if (!chartDimensions.every((x) => !!x) || !data) return;

    const width = chartDimensions[0];
    const height = chartDimensions[1];

    const svg = d3.select(chartRef.current);
    svg.selectAll("*").remove();

    const tooltip = d3.select(tooltipRef.current)
      .style("position", "absolute")
      .style("background", "var(--chakra-colors-bg)")
      .style("padding", "8px")
      .style("border", "1px solid var(--chakra-colors-border)")
      .style("border-radius", "4px")
      .style("display", "none");

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    if (chartType === "bar") {
      const maxValue = d3.max(data.values) || 0;
      const margin = { top: 24, right: 1, bottom: 24, left: 1 };

      const x = d3.scaleBand()
        .domain(data.categories)
        .range([margin.left, width - margin.right])
        .padding(0.1);

      const y = d3.scaleLinear()
        .domain([0, maxValue])
        .nice()
        .range([height - margin.bottom, margin.top]);

      // X-axis
      svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("font-size", "12px")
        .text((d: unknown) => {
          const str = String(d);
          return str.length > 10 ? `${str.slice(0, 10)}...` : str;
        });

      // Y-axis with custom tick format
      const customTickFormat = (d: d3.NumberValue) => (Math.abs(+d) < 1000 ? d3.format("~f")(+d) : d3.format(".2s")(+d));
      svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).tickFormat(customTickFormat))
        .selectAll("text")
        .style("font-size", "0.8em");

      // Render y-axis unit label if available
      if (data.unit) {
        svg.append("text")
          .attr("transform", `translate(${margin.left / 2 - 15},${(height - margin.top - margin.bottom) / 2}) rotate(-90)`)
          .style("text-anchor", "middle")
          .text(data.unit);
      }

      // Render bars
      svg.append("g")
        .selectAll("rect")
        .data(data.values.map((value: number, i: number) => ({ value, category: data.categories[i] })))
        .enter()
        .append("rect")
        .attr("x", (d: { value: number; category: string }) => x(d.category) || 0)
        .attr("y", (d: { value: number; category: string }) => y(d.value))
        .attr("height", (d: { value: number; category: string }) => y(0) - y(d.value))
        .attr("width", x.bandwidth())
        .attr("fill", (_d: { value: number; category: string }, i: number) => color(i.toString()))
        .on("mouseover", (event: MouseEvent, d: { value: number; category: string }) => {
          tooltip.style("visibility", "visible").text(`${d.category}, ${d.value}`);
        })
        .on("mousemove", (event: MouseEvent) => {
          if (containerRef.current) {
            const containerBounds = containerRef.current.getBoundingClientRect();
            tooltip.style("display", "block")
              .style("left", `${event.clientX - containerBounds.left + 10}px`)
              .style("top", `${event.clientY - containerBounds.top + 10}px`);
          }
        })
        .on("mouseout", () => {
          tooltip.style("visibility", "hidden");
        });
    } else {
      // Pie chart rendering
      const radius = Math.min(width, height) / 2;
      const pie = d3.pie<{ name: string; value: number }>().value((d: { name: string; value: number }) => d.value);
      const pieData = pie(data.categories.map((category: string, index: number) => ({ name: category, value: data.values[index] })));
      const arc = d3.arc<d3.PieArcDatum<{ name: string; value: number }>>().innerRadius(0).outerRadius(radius);

      const pieGroup = svg.append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

      pieGroup.selectAll("path")
        .data(pieData)
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", (_d: d3.PieArcDatum<{ name: string; value: number }>, i: number) => color(i.toString()))
        .style("stroke", "var(--chakra-colors-border-emphasized)")
        .style("stroke-width", "2px")
        .on("mouseover", (event: MouseEvent, d: d3.PieArcDatum<{ name: string; value: number }>) => {
          tooltip.style("visibility", "visible")
            .style("display", "block")
            .text(`${d.data.name}: ${d.data.value}`);
        })
        .on("mousemove", (event: MouseEvent) => {
          if (containerRef.current) {
            const containerBounds = containerRef.current.getBoundingClientRect();
            tooltip.style("left", `${event.clientX - containerBounds.left + 10}px`)
              .style("top", `${event.clientY - containerBounds.top + 10}px`);
          }
        })
        .on("mouseout", () => {
          tooltip.style("visibility", "hidden");
        });
    }
  }, [data, chartType, chartDimensions]);

  return (
    <Box ref={containerRef} style={{ position: "relative" }}>
      <IconButton
        onClick={() => setChartType(chartType === "bar" ? "pie" : "bar")}
        aria-label="Toggle Chart Type"
        mt={2}
        px={2}
        variant="surface"
        size="xs"
      >
        Toggle Chart Type {chartType === "bar" ? <ChartPieIcon /> : <ChartBarIcon />}
      </IconButton>
      <svg
        ref={chartRef}
        width={chartDimensions[0]}
        height={chartDimensions[1]}
      />
      <div ref={tooltipRef} />
    </Box>
  );
}
