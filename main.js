// main.js

// ─── 0) Margins & SVG setup ────────────────────────────────────────────────
const margin = { top: 10, right: 20, bottom: 30, left: 50 };
const ovW    = 960 - margin.left - margin.right;
const ovH    = 200 - margin.top - margin.bottom;
const detW   = 960 - margin.left - margin.right;
const detH   = 400 - margin.top - margin.bottom;
const heatH  = 20;   // height of our heatmap strip

// Threshold for “run” of V-beats before annotating
const runLengthThresh = 3;

// ─── Tooltip ────────────────────────────────────────────────────────────────
const tooltip = d3.select("body")
  .append("div")
    .attr("class", "tooltip")
    .style("position",      "absolute")
    .style("background",    "white")
    .style("border",        "1px solid gray")
    .style("padding",       "6px")
    .style("border-radius", "4px")
    .style("pointer-events","none")
    .style("opacity",       0);

// ─── Overview SVG ─────────────────────────────────────────────────────────
const overviewSvg = d3.select("#overview")
  .attr("width",  ovW + margin.left + margin.right)
  .attr("height", ovH + margin.top + margin.bottom + heatH + 4)
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top + heatH + 4})`);

const heatmapG = overviewSvg.append("g")
  .attr("class", "heatmap")
  .attr("transform", `translate(0,${-heatH - 4})`);

const detailSvg = d3.select("#detail")
  .attr("width",  detW + margin.left + margin.right)
  .attr("height", detH + margin.top + margin.bottom)
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// arrow marker for narrative annotation
detailSvg.append("defs")
  .append("marker")
    .attr("id", "arrow")
    .attr("viewBox", "0 0 10 10")
    .attr("refX",  0)
    .attr("refY",  5)
    .attr("markerWidth",  6)
    .attr("markerHeight", 6)
    .attr("orient",       "auto-start-reverse")
  .append("path")
    .attr("d",    "M0,0 L10,5 L0,10 Z")
    .attr("fill", "red");

// ─── 1) Load the data ────────────────────────────────────────────────────────
d3.csv("rr_intervals.csv", d => ({
  time_sec:   +d.time_sec,
  rr_ms:      +d.rr_ms,
  annotation: d.annotation,   // e.g. "N", "V", etc.
  record_id:  d.record_id
})).then(data => {

  // ─── 2) Record dropdown ────────────────────────────────────────────────────
  const recordIds = Array.from(new Set(data.map(d => d.record_id))).sort();
  const recordSelect = d3.select("#record-select");
  recordSelect
    .selectAll("option")
    .data(recordIds)
    .join("option")
      .attr("value", d => d)
      .text(d => d);

  // ─── 3) Scales, axes, line generators ──────────────────────────────────────
  const xOv  = d3.scaleLinear().range([0, ovW]);
  const yOv  = d3.scaleLinear().range([ovH, 0]);
  const xDet = d3.scaleLinear().range([0, detW]);
  const yDet = d3.scaleLinear().range([detH, 0]);

  const lineOv  = d3.line().x(d => xOv(d.time_sec)).y(d => yOv(d.rr_ms));
  const lineDet = d3.line().x(d => xDet(d.time_sec)).y(d => yDet(d.rr_ms));

  // ── Append axes groups & overview path ────────────────────────────────────
  const xOvG  = overviewSvg.append("g").attr("transform", `translate(0,${ovH})`);
  const yOvG  = overviewSvg.append("g");
  const ovPath = overviewSvg.append("path")
    .attr("class", "overview-line")
    .attr("fill",    "none")
    .attr("stroke",  "steelblue")
    .attr("stroke-width", 1);

  // ── **ADD OVERVIEW TITLE & AXIS LABELS** ────────────────────────────────
  overviewSvg.append("text")
    .attr("class", "chart-title")
    .attr("x", ovW / 2)
    .attr("y", -heatH - margin.top / 2)
    .attr("text-anchor", "middle")
    .attr("font-size",   "16px")
    .text("RR Interval Overview");

  overviewSvg.append("text")
    .attr("class", "axis-label")
    .attr("x", ovW / 2)
    .attr("y", ovH + margin.bottom - 4)
    .attr("text-anchor", "middle")
    .attr("font-size",   "12px")
    .text("Time (s)");

  overviewSvg.append("text")
    .attr("class", "axis-label")
    .attr("transform", `rotate(-90)`)
    .attr("x", -ovH / 2)
    .attr("y", -margin.left + 15)
    .attr("text-anchor", "middle")
    .attr("font-size",   "12px")
    .text("RR interval (ms)");

  // ── Brush for overview ────────────────────────────────────────────────────
  const brush = d3.brushX()
    .extent([[0,0],[ovW,ovH]])
    .on("brush end", brushed);
  overviewSvg.append("g").attr("class","brush").call(brush);

  // ── Append detail axes & detail path ──────────────────────────────────────
  const xDetG  = detailSvg.append("g").attr("transform", `translate(0,${detH})`);
  const yDetG  = detailSvg.append("g");
  const detPath = detailSvg.append("path")
    .attr("class", "detail-line")
    .attr("fill",   "none")
    .attr("stroke", "tomato")
    .attr("stroke-width", 1.5);

  // ── **ADD DETAIL TITLE & AXIS LABELS** ────────────────────────────────
  detailSvg.append("text")
    .attr("class", "chart-title")
    .attr("x", detW / 2)
    .attr("y", -margin.top / 2)
    .attr("text-anchor", "middle")
    .attr("font-size",   "16px")
    .text("RR Interval Detail");

  detailSvg.append("text")
    .attr("class", "axis-label")
    .attr("x", detW / 2)
    .attr("y", detH + margin.bottom - 4)
    .attr("text-anchor", "middle")
    .attr("font-size",   "12px")
    .text("Time (s)");

  detailSvg.append("text")
    .attr("class", "axis-label")
    .attr("transform", `rotate(-90)`)
    .attr("x", -detH / 2)
    .attr("y", -margin.left + 15)
    .attr("text-anchor", "middle")
    .attr("font-size",   "12px")
    .text("RR interval (ms)");

  // ─── A) Annotation selector & legend ───────────────────────────────────────
  const annTypes = Array.from(new Set(data.map(d => d.annotation))).sort();
  const colorScale = d3.scaleOrdinal()
    .domain(annTypes)
    .range(d3.schemeCategory10);

  const annSelect = d3.select("#annotation-select");
  annSelect.selectAll("option")
    .data(annTypes)
    .join("option")
      .attr("value", d => d)
      .text(d => d)
      .property("selected", true);
  annSelect.on("change", () => {
    const ext = d3.brushSelection(overviewSvg.select(".brush").node());
    if (ext) {
      updateDetail(xOv.invert(ext[0]), xOv.invert(ext[1]));
    } else {
      const [t0, t1] = d3.extent(currentData, d => d.time_sec);
      updateDetail(t0, t1);
    }
  });

  const legendContainer = d3.select("#legend");
  annTypes.forEach(ann => {
    const item = legendContainer.append("span").attr("class","legend-item");
    item.append("span")
        .style("width","12px")
        .style("height","12px")
        .style("background-color", colorScale(ann))
        .style("display","inline-block")
        .style("margin-right","4px");
    item.append("span")
        .text(ann)
        .style("font-size","12px");
  });

  // ─── 5) updateOverview: overview line + heatmap + reset detail ───────────
  let currentData = [];
  function updateOverview(recId) {
    currentData = data.filter(d => d.record_id === recId);

    xOv.domain(d3.extent(currentData, d => d.time_sec));
    yOv.domain(d3.extent(currentData, d => d.rr_ms));
    xOvG.call(d3.axisBottom(xOv));
    yOvG.call(d3.axisLeft(yOv));

    ovPath.datum(currentData).attr("d", lineOv);

    heatmapG.selectAll("rect")
      .data(currentData)
      .join("rect")
        .attr("x",      d => xOv(d.time_sec))
        .attr("y",      0)
        .attr("width",  2)
        .attr("height", heatH)
        .attr("fill",   d => d.annotation === 'V' ? 'red' : 'lightgray')
        .attr("opacity",0.6);

    overviewSvg.select(".brush").call(brush.move, null);
    const [t0, t1] = d3.extent(currentData, d => d.time_sec);
    updateDetail(t0, t1);
  }

  // ─── 4) updateDetail: scatter + narrative annotation ──────────────────────
  function updateDetail(t0, t1) {
    const window = currentData.filter(d => d.time_sec >= t0 && d.time_sec <= t1);
    const selectedAnns = Array.from(
      d3.select("#annotation-select").property("selectedOptions"),
      opt => opt.value
    );
    const slice = window.filter(d => selectedAnns.includes(d.annotation));

    xDet.domain([t0, t1]);
    yDet.domain(d3.extent(window, d => d.rr_ms));
    xDetG.call(d3.axisBottom(xDet));
    yDetG.call(d3.axisLeft(yDet));

    const pts = detailSvg.selectAll("circle").data(slice, d => d.time_sec);
    pts.join(
      enter => enter.append("circle")
        .attr("r", 2)
        .attr("cx", d => xDet(d.time_sec))
        .attr("cy", d => yDet(d.rr_ms))
        .attr("fill", d => colorScale(d.annotation))
        .on("mouseover", (e,d) => {
          tooltip.style("opacity",1)
            .html(`Time: ${d.time_sec.toFixed(1)}s<br/>RR: ${d.rr_ms.toFixed(1)}ms<br/>Type: ${d.annotation}`)
            .style("left", (e.pageX+8)+"px")
            .style("top",  (e.pageY-28)+"px");
        })
        .on("mouseout", () => tooltip.style("opacity",0)),
      update => update
        .attr("cx", d => xDet(d.time_sec))
        .attr("cy", d => yDet(d.rr_ms))
        .attr("fill", d => colorScale(d.annotation)),
      exit => exit.remove()
    );

    detailSvg.selectAll(".narrative").remove();

    for (let i = 0; i <= slice.length - runLengthThresh; i++) {
      const run = slice.slice(i, i + runLengthThresh);
      if (run.every(pt => pt.annotation === 'V')) {
        const eventTime = run[0].time_sec;
        const maxRR      = d3.max(slice, d => d.rr_ms);

        detailSvg.append("text")
          .attr("class", "narrative")
          .attr("x", xDet(eventTime))
          .attr("y", yDet(maxRR) - 20)
          .text("Run of ventricular ectopy")
          .attr("fill", "red")
          .attr("font-size", "12px");

        detailSvg.append("line")
          .attr("class", "narrative")
          .attr("x1", xDet(eventTime))
          .attr("x2", xDet(eventTime))
          .attr("y1", yDet(maxRR) - 18)
          .attr("y2", yDet(maxRR) - 2)
          .attr("stroke", "red")
          .attr("marker-end", "url(#arrow)");

        break;
      }
    }
  }

  // ─── 6) Brush handler ──────────────────────────────────────────────────────
  function brushed({selection}) {
    if (!selection) return;
    updateDetail(xOv.invert(selection[0]), xOv.invert(selection[1]));
  }

  // ─── 7) Initialize ─────────────────────────────────────────────────────────
  recordSelect
    .on("change", () => updateOverview(recordSelect.property("value")))
    .property("value", recordIds[0]);

  updateOverview(recordIds[0]);
});
