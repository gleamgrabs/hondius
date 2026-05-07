"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface DataPoint {
  date: Date;
  cases: number;
}

const chartData: DataPoint[] = [
  { date: new Date("2026-04-06"), cases: 1 },
  { date: new Date("2026-04-28"), cases: 2 },
  { date: new Date("2026-05-02"), cases: 3 },
  { date: new Date("2026-05-04"), cases: 4 },
  { date: new Date("2026-05-05"), cases: 7 },
  { date: new Date("2026-05-07"), cases: 8 },
];

export default function CasesChart() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth || 600;
    const margin = { top: 16, right: 24, bottom: 40, left: 36 };
    const width = containerWidth - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    svg
      .attr("width", containerWidth)
      .attr("height", 200)
      .attr("viewBox", `0 0 ${containerWidth} 200`);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleTime()
      .domain(d3.extent(chartData, (d) => d.date) as [Date, Date])
      .range([0, width]);

    const y = d3
      .scaleLinear()
      .domain([0, 10])
      .range([height, 0]);

    // Gridlines
    g.append("g")
      .attr("class", "gridlines")
      .selectAll("line")
      .data(y.ticks(5))
      .join("line")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", (d) => y(d))
      .attr("y2", (d) => y(d))
      .attr("stroke", "#e5e5e5")
      .attr("stroke-width", 1);

    // Area
    const area = d3
      .area<DataPoint>()
      .x((d) => x(d.date))
      .y0(height)
      .y1((d) => y(d.cases))
      .curve(d3.curveStepAfter);

    g.append("path")
      .datum(chartData)
      .attr("fill", "#c8322a")
      .attr("fill-opacity", 0.08)
      .attr("d", area);

    // Line
    const line = d3
      .line<DataPoint>()
      .x((d) => x(d.date))
      .y((d) => y(d.cases))
      .curve(d3.curveStepAfter);

    g.append("path")
      .datum(chartData)
      .attr("fill", "none")
      .attr("stroke", "#c8322a")
      .attr("stroke-width", 1.5)
      .attr("d", line);

    // Data points
    g.selectAll("circle")
      .data(chartData)
      .join("circle")
      .attr("cx", (d) => x(d.date))
      .attr("cy", (d) => y(d.cases))
      .attr("r", 3)
      .attr("fill", "#c8322a");

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3
          .axisBottom(x)
          .ticks(5)
          .tickFormat((d) =>
            d3.timeFormat("%d %b")(d as Date)
          )
      )
      .call((axis) => {
        axis.select(".domain").remove();
        axis.selectAll(".tick line").remove();
        axis
          .selectAll(".tick text")
          .attr("font-family", "var(--font-jetbrains-mono), monospace")
          .attr("font-size", "10")
          .attr("fill", "#9a9a9a")
          .attr("text-transform", "uppercase");
      });

    // Y axis
    g.append("g")
      .call(d3.axisLeft(y).ticks(5).tickSize(0))
      .call((axis) => {
        axis.select(".domain").remove();
        axis
          .selectAll(".tick text")
          .attr("font-family", "var(--font-jetbrains-mono), monospace")
          .attr("font-size", "10")
          .attr("fill", "#9a9a9a")
          .attr("dx", "-4");
      });
  }, []);

  return (
    <figure className="my-8">
      <h2 className="text-display-sm font-medium text-color-text mb-4">
        Confirmed cases over time
      </h2>
      <div ref={containerRef} className="w-full overflow-hidden">
        <svg
          ref={svgRef}
          role="img"
          aria-label="Step chart showing cumulative confirmed hantavirus cases from 6 April to 7 May 2026, rising from 1 to 8 cases"
        />
      </div>
      <figcaption className="mt-2 text-xs text-color-text-muted">
        Cumulative confirmed cases of hantavirus (Andes strain) associated with
        MV Hondius. Source: WHO, national health authorities. Last updated 7 May
        2026.
      </figcaption>
    </figure>
  );
}
