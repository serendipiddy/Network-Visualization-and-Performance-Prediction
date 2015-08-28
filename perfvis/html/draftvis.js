
/* Layout functions */
var menu_addDp = function(dpid) {
  var op = $('<option></option>').attr('value',dpid).text(dpid);
  $('#node-select').append(op);
}

var populateListNum = function(select, data, sel) {
    var items = [];
    $.each(data, function (id, option) {
        if ($.inArray(id,sel)>=0 || sel.length==0) {
          items.push('<li>'+id+':  '+option.toFixed(6)+'</li>');
        }
    });  
    select.html(items.join(''));
}

var populateDPSpecs = function (dpid) {
  var specs = $('#specs');
  var data = pf_data.node_data[dpid];
  $('#select-brand').val(data.switch_brand);
  $('#select-model').val(data.queueing_model);
  
  $('#arrival-rate').val(data.adjustments['arrival_rate'].toFixed(2));
  $('#service-rate').val(data.adjustments['service_rate'].toFixed(2));
  $('#queue-capacity').val(data.adjustments['queue_capacity']);
  
  // populateListNum($('#switch-output'),data.output,[]);
  update_gui();
}

var setControlPanelListeners = function() {
  // var dpid = $('#node-select').val(); // cannot be here -> closure.. dpid == default OTL
  $('#select-brand').change(function() {
    var dpid = $('#node-select').val();
    console.log(dpid);
    pf_data.set_config(dpid, 'switch_brand', $('#select-brand').val());
    populateDPSpecs(dpid);
  });
  $('#select-model').change(function() {
    var dpid = $('#node-select').val();
    pf_data.set_config(dpid, 'queueing_model', $('#select-model').val());
    populateDPSpecs(dpid);
  });
  
  $('#arrival-rate').change(function() {
    var dpid = $('#node-select').val();
    pf_data.set_adjustment(dpid, 'arrival_rate', $('#arrival-rate').val());
    console.log('adjusted arrival');
    populateDPSpecs(dpid);
  });
  $('#service-rate').change(function() {
    var dpid = $('#node-select').val();
    pf_data.set_adjustment(dpid, 'service_rate', $('#service-rate').val());
    console.log('adjusted service');
    populateDPSpecs(dpid);
  });
  $('#queue-capacity').change(function() {
    var dpid = $('#node-select').val();
    var val = $('#queue-capacity').val();
    if (val < 0) val = 0;
    val = Math.round(val);
    pf_data.set_adjustment(dpid, 'queue_capacity', val);
    console.log('adjusted queue capacity');
    populateDPSpecs(dpid);
  });
}

$(document).ready(function() {
  var select = $('#node-select')
  select.change(function() {
    if (select.val() === 'default') {
      $('#specs').hide();
      return;
    }
    populateDPSpecs(select.val());
    $('#specs').show();
  });
  setControlPanelListeners();
  arrival_graph = d3.select("body").append("div")
          .attr("id", "graphs")
          .attr("width", CONF.force.width)
  drawGraph();
});

var arrival_graph = "";

var in_graph = {
  width: 300
}

var model_in = {
  labels: [
    'service_rate', 'arrival_rate', 'queue_capacity'
  ],
  series: [
  { 'label': '0000000000000001',
    'values': [56625,20000,0]
  },
  { 'label': '0000000000000002',
    'values': [56625, 28000, 0]
  },
  { 'label': '0000000000000003',
    'values': [56625, 11000, 0]
  },
  { 'label': '0000000000000004',
    'values': [56625, 10000, 0]
  },
  { 'label': '0000000000000005',
    'values': [56625, 30000, 0]
  },
  { 'label': '0000000000000006',
    'values': [56625, 18000, 0]
  },
  { 'label': '0000000000000007',
    'values': [56625, 15000, 0]
  }
  ]
}

var setGraphData = function() {
  model_in.labels = [
    'arrival-rate',
    'service-rate'
  ];
  model_in_data = pf_data.get_model_input_all();
  var series = [];
  for (dpid in model_in_data) {
    series.push({
      label: dpid,
      values: [
        model_in_data[dpid].arrival_rate,
        model_in_data[dpid].service_rate
      ]
    });
  }
  model_in.series = series;
}

var drawGraph = function() { return function() {
  var chartWidth       = 300,
      barHeight        = 20,
      groupHeight      = barHeight * model_in.series.length,
      gapBetweenGroups = 10,
      spaceForLabels   = 200,
      spaceForLegend   = 200;

  // Zip the series data together (first values, second values, etc.)
  var zippedData = [];
  for (var i=0; i<model_in.labels.length; i++) {
    for (var j=0; j<model_in.series.length; j++) {
      zippedData.push(model_in.series[j].values[i]);
    }
  }

  // Color scale
  var color = d3.scale.category20();
  var chartHeight = barHeight * zippedData.length + gapBetweenGroups * model_in.labels.length;

  var x = d3.scale.linear()
      .domain([0, d3.max(zippedData)])
      .range([0, chartWidth]);

  var y = d3.scale.log()
      .range([chartHeight + gapBetweenGroups, 0]);

  var yAxis = d3.svg.axis()
      .scale(y)
      .tickFormat('')
      .tickSize(0)
      .orient("left");

  // Specify the chart area and dimensions
  var chart = d3.select(".chart")
      .attr("width", spaceForLabels + chartWidth + spaceForLegend)
      .attr("height", chartHeight);

  // Create bars
  var bar = chart.selectAll("g")
      .data(zippedData)
      .enter().append("g")
      .attr("transform", function(d, i) {
        return "translate(" + spaceForLabels + "," + (i * barHeight + gapBetweenGroups * (0.5 + Math.floor(i/model_in.series.length))) + ")";
      });

  // Create rectangles of the correct width
  bar.append("rect")
      .attr("fill", function(d,i) { return color(i % model_in.series.length); })
      .attr("class", "bar")
      .attr("width", x)
      .attr("height", barHeight - 1);

  // Add text label in bar
  bar.append("text")
      .attr("x", function(d) { return x(d) - 3; })
      .attr("y", barHeight / 2)
      .attr("fill", "red")
      .attr("dy", ".35em")
      .text(function(d) { return d; });

  // Draw labels
  bar.append("text")
      .attr("class", "label")
      .attr("x", function(d) { return - 10; })
      .attr("y", groupHeight / 2)
      .attr("dy", ".35em")
      .text(function(d,i) {
        if (i % model_in.series.length === 0)
          return model_in.labels[Math.floor(i/model_in.series.length)];
        else
          return ""});

  chart.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(" + spaceForLabels + ", " + -gapBetweenGroups/2 + ")")
        .call(yAxis);

  // Draw legend
  var legendRectSize = 18,
      legendSpacing  = 4;

  var legend = chart.selectAll('.legend')
      .data(model_in.series)
      .enter()
      .append('g')
      .attr('transform', function (d, i) {
          var height = legendRectSize + legendSpacing;
          var offset = -gapBetweenGroups/2;
          var horz = spaceForLabels + chartWidth + 40 - legendRectSize;
          var vert = i * height - offset;
          return 'translate(' + horz + ',' + vert + ')';
      });

  legend.append('rect')
      .attr('width', legendRectSize)
      .attr('height', legendRectSize)
      .style('fill', function (d, i) { return color(i); })
      .style('stroke', function (d, i) { return color(i); });

  legend.append('text')
      .attr('class', 'legend')
      .attr('x', legendRectSize + legendSpacing)
      .attr('y', legendRectSize - legendSpacing)
      .text(function (d) { return d.label; });
}}