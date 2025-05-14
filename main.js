const margin = { top: 30, right: 20, bottom: 30, left: 50 };
const width = 960 - margin.left - margin.right;
const ovHeight = 200 - margin.top - margin.bottom;
const detHeight = 300 - margin.top - margin.bottom;

let allData = [];
let currentRecord = null;
let annTypes = [];
let annotationLabels = {};
let colorScale;
let currentTimeRange = null;

let xOv, yOv, overviewSvg;

d3.csv("rr_intervals.csv", d => ({
  time_sec: +d.time_sec,
  rr_ms: +d.rr_ms,
  annotation: d.annotation,
  record_id: d.record_id
})).then(data => {
  allData = data;

  annotationLabels = {
    '+': 'R-peak onset',
    '/': 'Paced beat',
    'A': 'Atrial premature beat',
    'a': 'Aberrated atrial premature beat',
    'J': 'Junctional premature beat',
    'S': 'Supraventricular premature beat',
    'V': 'Premature ventricular contraction (PVC)',
    'L': 'Left bundle branch-block beat',
    'R': 'Right bundle branch-block beat',
    'F': 'Fusion of normal & ventricular beat',
    'f': 'Fusion of paced & normal beat',
    'Q': 'Unclassified QRS complex',
    'x': 'External pacemaker spike',
    '~': 'T-wave marker / no QRS',
    'j': 'Junctional escape beat',
    '|': 'Non-conducted P-wave',
    'N': 'Normal sinus beat',
    'i': 'Non-conducted P-wave'
  };

  const recordIds = Array.from(new Set(data.map(d => d.record_id))).sort();
  d3.select("#record-select")
    .selectAll("option")
    .data(recordIds)
    .join("option")
    .attr("value", d => d)
    .text(d => d)
    .property("selected", (d, i) => i === 0);

  currentRecord = recordIds[0];
  d3.select("#record-select").on("change", () => {
    currentRecord = d3.select("#record-select").property("value");
    currentTimeRange = null;
    renderOverview();
  });

  annTypes = Array.from(new Set(data.map(d => d.annotation))).sort();

  colorScale = d3.scaleOrdinal()
    .domain(annTypes)
    .range(d3.schemeCategory10);

  const btnContainer = d3.select("#beat-buttons");

  annTypes.forEach(code => {
    btnContainer.append("button")
      .attr("class", "beat-toggle")
      .attr("data-code", code)
      .text(annotationLabels[code] || code)
      .style("border-color", colorScale(code))
      .on("click", function () {
        const btn = d3.select(this);
        const active = !btn.classed("active");
        btn.classed("active", active);

        if (active) {
          btn.style("background-color", colorScale(code))
            .style("color", "white");
        } else {
          btn.style("background-color", null)
            .style("color", null);
        }

        if (currentTimeRange) {
          updateDetailCharts(currentTimeRange[0], currentTimeRange[1]);
        } else {
          const full = allData.filter(d => d.record_id === currentRecord);
          const [t0, t1] = d3.extent(full, d => d.time_sec);
          updateDetailCharts(t0, t1);
        }
      });
  });

  renderOverview();
});

function renderOverview() {
  const filtered = allData.filter(d => d.record_id === currentRecord);

  xOv = d3.scaleLinear()
    .domain(d3.extent(filtered, d => d.time_sec))
    .range([0, width]);

  yOv = d3.scaleLinear()
    .domain(d3.extent(filtered, d => d.rr_ms))
    .range([ovHeight, 0]);

  d3.select("#overview").html("");
  overviewSvg = d3.select("#overview")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  overviewSvg.append("g")
    .attr("transform", `translate(0,${ovHeight})`)
    .call(d3.axisBottom(xOv));

  overviewSvg.append("g")
    .call(d3.axisLeft(yOv));

  const line = d3.line()
    .x(d => xOv(d.time_sec))
    .y(d => yOv(d.rr_ms));

  overviewSvg.append("path")
    .datum(filtered)
    .attr("fill", "none")
    .attr("stroke", "#0077cc")
    .attr("stroke-width", 1.5)
    .attr("d", line);

  overviewSvg.append("g")
    .attr("class", "brush")
    .call(
      d3.brushX()
        .extent([[0, 0], [width, ovHeight]])
        .on("brush end", ({ selection }) => {
          if (selection) {
            const [x0, x1] = selection.map(xOv.invert);
            currentTimeRange = [x0, x1];
            updateDetailCharts(x0, x1);
          }
        })
    );

  const [t0, t1] = d3.extent(filtered, d => d.time_sec);
  currentTimeRange = [t0, t1];
  updateDetailCharts(t0, t1);
}

function updateDetailCharts(t0, t1) {
  const selectedCodes = d3.selectAll(".beat-toggle.active").nodes()
    .map(btn => btn.getAttribute("data-code"));

  const full = allData.filter(d =>
    d.record_id === currentRecord &&
    d.time_sec >= t0 &&
    d.time_sec <= t1
  );

  const detailDiv = d3.select("#detail-charts");
  detailDiv.html("");

  const charts = [{
    label: "Aggregate",
    data: full.filter(d => selectedCodes.includes(d.annotation)),
    color: "multi"
  }];

  selectedCodes.forEach(code => {
    charts.push({
      label: annotationLabels[code] || code,
      data: full.filter(d => d.annotation === code),
      color: colorScale(code)
    });
  });

  charts.forEach(chart => {
    if (chart.data.length === 0) {
      detailDiv.append("div")
        .style("margin", "40px 0")
        .style("text-align", "center")
        .style("color", "#777")
        .style("font-style", "italic")
        .style("font-size", "14px")
        .text(`No information available for ${chart.label}`);
      return;
    }

    const svgWrap = detailDiv.append("div")
      .style("margin-bottom", "40px");

    const svg = svgWrap.append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", detHeight + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
      .domain([t0, t1])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain(d3.extent(chart.data, d => d.rr_ms))
      .range([detHeight, 0]);

    svg.append("g")
      .attr("transform", `translate(0,${detHeight})`)
      .call(d3.axisBottom(x));

    svg.append("g")
      .call(d3.axisLeft(y));

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .text(chart.label);

    svg.selectAll("circle")
      .data(chart.data)
      .join("circle")
      .attr("cx", d => x(d.time_sec))
      .attr("cy", d => y(d.rr_ms))
      .attr("r", 2.5)
      .attr("fill", d =>
        chart.color === "multi"
          ? colorScale(d.annotation)
          : chart.color
      )
      .attr("opacity", 0.7);
  });
}



