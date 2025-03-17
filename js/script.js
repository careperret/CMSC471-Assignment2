console.log('D3 Version:', d3.version);

const margin = { top: 80, right: 120, bottom: 60, left: 100 };
const width = 800 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

let allData = [];
let xVar = 'date';
let yVar = 'temp';
let region = 'South Atlantic';
let timestep = "1 month";
let timestepNum = 1;
const options = [
    { value: 'temp', label: 'Average Temperature' },
    { value: 'wind', label: 'Wind Speed' },
    { value: 'snow', label: 'Snow' },
    { value: 'precip', label: 'Precipitation' }
];
const timestepOptions = ['1 month', '2 months', '6 months'];
let startDate, endDate;
let dateSlider;
const colorScale = d3.scaleOrdinal(d3.schemeCategory10);  // 10 distinct colors
let allDates, minDate, maxDate;

const stateNames = {
    'WV': 'West Virginia', 'VA': 'Virginia', 'NC': 'North Carolina',
    'SC': 'South Carolina', 'GA': 'Georgia', 'FL': 'Florida',
    'MD': 'Maryland', 'DE': 'Delaware', 'NJ': 'New Jersey',
    'NY': 'New York', 'PA': 'Pennsylvania', 'DC': 'District of Columbia',
    'CT': 'Connecticut', 'RI': 'Rhode Island', 'MA': 'Massachusetts',
    'NH': 'New Hampshire', 'VT': 'Vermont', 'ME': 'Maine',
    'OH': 'Ohio', 'IN': 'Indiana', 'IL': 'Illinois', 'MI': 'Michigan', 'WI': 'Wisconsin',
    'MN': 'Minnesota', 'IA': 'Iowa', 'MO': 'Missouri', 'KS': 'Kansas', 'NE': 'Nebraska', 'SD': 'South Dakota', 'ND': 'North Dakota',
    'KY': 'Kentucky', 'TN': 'Tennessee', 'AL': 'Alabama', 'MS': 'Mississippi',
    'AR': 'Arkansas', 'OK': 'Oklahoma', 'LA': 'Louisiana', 'TX': 'Texas',
    'MT': 'Montana', 'ID': 'Idaho', 'WY': 'Wyoming', 'NV': 'Nevada', 'UT': 'Utah', 'AZ': 'Arizona', 'NM': 'New Mexico', 'CO': 'Colorado',
    'WA': 'Washington', 'OR': 'Oregon', 'CA': 'California', 'AK': 'Alaska', 'HI': 'Hawaii'
};

const svg = d3.select('#vis')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

const regions = {
    'South Atlantic': ['WV', 'VA', 'NC', 'SC', 'GA', 'FL'],
    'Mid Atlantic': ['MD', 'DE', 'NJ', 'NY', 'PA', 'DC'],
    'New England': ['CT', 'RI', 'MA', 'NH', 'VT', 'ME'],
    'East North Central': ['OH', 'IN', 'IL', 'MI', 'WI'],
    'West North Central': ['MN', 'IA', 'MO', 'KS', 'NE', 'SD', 'ND'],
    'East South Central': ['KY', 'TN', 'AL', 'MS'],
    'West South Central': ['AR', 'OK', 'LA', 'TX'],
    'Mountain': ['MT', 'ID', 'WY', 'NV', 'UT', 'AZ', 'NM', 'CO'],
    'Pacific': ['WA', 'OR', 'CA', 'AK', 'HI']
};

function init() {
    d3.csv("./data/weather.csv", function (d) {
        return {
            state: d.state,
            date: d3.timeParse("%Y%m%d")(d.date),
            temp: +d.TAVG,
            wind: +d.AWND,
            snow: +d.SNOW,
            precip: +d.PRCP
        };
    }).then(data => {
        // get averages
        const averagedData = d3.groups(data, d => d.state, d => d.date)
            .map(([state, stateData]) => ({
                state: state,
                values: stateData.map(([date, entries]) => ({
                    date: date,
                    temp: d3.mean(entries, d => d.temp),
                    wind: d3.mean(entries, d => d.wind),
                    snow: d3.mean(entries, d => d.snow),
                    precip: d3.mean(entries, d => d.precip)
                    //sort data
                })).sort((a, b) => a.date - b.date)
            }));

        allData = averagedData;

        setupSelector();
        updateAxes();
        updateVis();
    }).catch(error => console.error('Error loading data:', error));
}

function setupSelector() {
    d3.select('#yVariable')
        .selectAll('option')
        .data(options)
        .enter()
        .append('option')
        .text(d => d.label)
        .attr("value", d => d.value);

    d3.select('#region')
        .selectAll('option')
        .data(Object.keys(regions))
        .enter()
        .append('option')
        .text(d => d)
        .attr("value", d => d);

    d3.select('#timestep')
        .selectAll('option')
        .data(timestepOptions)
        .enter()
        .append('option')
        .text(d => d)
        .attr("value", d => d);

    allDates = allData.flatMap(d => d.values.map(v => v.date));
    minDate = d3.min(allDates);
    maxDate = d3.max(allDates);

    d3.selectAll('.variable')
        .on("change", function () {
            const selected = d3.select(this).property("id");
            if (selected === "yVariable") {
                yVar = d3.select(this).property("value");
            } else if (selected === "region") {
                region = d3.select(this).property("value");
            } else if (selected == "timestep") {
                timestep = d3.select(this).property("value");
                if (timestep == "1 month") {
                    timestepNum = 1;
                } else if (timestep == "2 months") {
                    timestepNum = 2;
                } else if (timestep == "6 months") {
                    timestepNum = 6;
                }

                const maxValidStartDate = new Date(maxDate);
                maxValidStartDate.setMonth(maxValidStartDate.getMonth() - timestepNum);

                // check if current startDate would result in an endDate beyond maxDate
                if (startDate > maxValidStartDate) {
                    startDate = maxValidStartDate;
                    dateSlider.value(startDate); // update slider position
                }

                endDate = new Date(startDate);
                endDate.setMonth(endDate.getMonth() + timestepNum);


            }
            updateDateSlider();
            updateAxes();
            updateVis();
        });

    // set initial window to first two months
    startDate = minDate;
    endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + timestepNum);

    maxDate.setMonth(maxDate.getMonth() - timestepNum);

    dateSlider = d3.sliderBottom()
        .min(minDate)
        .max(maxDate)
        .width(width - 30)
        .tickFormat(d3.timeFormat('%b %Y'))
        .ticks(10)
        .default(startDate)
        .on('onchange', (val) => {
            // when slider changes, update the date window
            startDate = new Date(val);
            endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + timestepNum);

            updateAxes();
            updateVis();
        });

    d3.select('#slider')
        .append('svg')
        .attr('width', width + margin.left)
        .attr('height', 100)
        .append('g')
        .attr('transform', `translate(${margin.left},30)`)
        .call(dateSlider);
}

function updateDateSlider() {
    const currentDate = new Date(startDate);

    const adjustedMaxDate = new Date(maxDate);
    adjustedMaxDate.setMonth(adjustedMaxDate.getMonth() - timestepNum);

    dateSlider.max(adjustedMaxDate);

    dateSlider.value(currentDate);

    d3.select('#slider g').call(dateSlider);
}

function updateAxes() {
    svg.selectAll('.axis').remove();
    svg.selectAll('.labels').remove();

    xScale = d3.scaleTime()
        .domain([startDate, endDate])
        .range([0, width]);
    const xAxis = d3.axisBottom(xScale);

    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`)
        .call(xAxis);

    // get data for the selected region
    const filteredData = allData.filter(d => regions[region].includes(d.state));

    const dateFilteredData = filteredData.map(state => {
        return {
            state: state.state,
            values: state.values.filter(v => v.date >= startDate && v.date <= endDate)
        };
    });

    // find bottom of y range
    const minValue = d3.min(filteredData.flatMap(d =>
        d.values.length > 0 ? d.values.map(v => v[yVar]) : [Infinity]
    ));

    const yMin = Math.min(0, minValue);

    // set y scale
    yScale = d3.scaleLinear()
        .domain([yMin, d3.max(filteredData.flatMap(d =>
            d.values.length > 0 ? d.values.map(v => v[yVar]) : [0]
        ))])
        .range([height, 0]);

    const yAxis = d3.axisLeft(yScale);

    svg.append("g")
        .attr("class", "axis")
        .call(yAxis);

    // add labels
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 20)
        .attr("text-anchor", "middle")
        .text("Date")
        .attr('class', 'labels');

    const yVarLabel = options.find(opt => opt.value === yVar).label;

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 40)
        .attr("text-anchor", "middle")
        .text(yVarLabel)
        .attr('class', 'labels');
}

function updateVis() {
    const filteredData = allData.filter(d => regions[region].includes(d.state));

    const dateFilteredData = filteredData.map(state => {
        return {
            state: state.state,
            values: state.values.filter(v => v.date >= startDate && v.date <= endDate)
        };
    }).filter(d => d.values.length > 0); // remove states with no data in the range

    const line = d3.line()
        .x(d => xScale(d.date))
        .y(d => yScale(d[yVar]))
        .curve(d3.curveMonotoneX);

    svg.selectAll('.line').remove();
    svg.selectAll('.tooltip-area').remove();

    // draw lines
    svg.selectAll('.line')
        .data(dateFilteredData)
        .enter()
        .append('path')
        .attr('class', 'line')
        .attr('d', d => line(d.values))
        .attr('stroke', d => colorScale(d.state))
        .attr('fill', 'none')
        .attr('stroke-width', 2)
        // tool tip
        .on('mouseover', function (event, d) {
            // get mouse position and find closest data point
            const [mouseX] = d3.pointer(event);
            const x0 = xScale.invert(mouseX); // date corresponding to mouse position
            const bisectDate = d3.bisector(d => d.date).left;
            const idx = bisectDate(d.values, x0);
            const closestPoint = d.values[idx];
        
            if (closestPoint) {
                d3.select('#tooltip')
                    .style("display", 'block')
                    .html(`
                        <strong>${stateNames[d.state]}</strong><br/>
                        Date: ${d3.timeFormat("%B %d, %Y")(closestPoint.date)}<br/>
                        ${options.find(opt => opt.value === yVar).label}: ${closestPoint[yVar].toFixed(2)}
                    `)
                    .style("left", (event.pageX + 20) + "px")
                    .style("top", (event.pageY - 28) + "px")
                    .raise();
            }
        })
        .on("mouseout", function (event, d) {
            d3.select('#tooltip')
                .style('display', 'none');
        });

    addLegend(dateFilteredData);
}

function addLegend(groupedData) {
    svg.selectAll('.legend').remove();

    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width + 20}, 20)`);

    legend.selectAll('.legend-item')
        .data(groupedData.map(d => d.state))
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(0, ${i * 20})`)
        .each(function (d) {
            d3.select(this).append('rect')
                .attr('width', 12)
                .attr('height', 12)
                .attr('fill', colorScale(d));

            d3.select(this).append('text')
                .attr('x', 18)
                .attr('y', 10)
                .text(d);
        });
}

// initialize the visualization
window.addEventListener('load', init);
