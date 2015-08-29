
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
});

var graphs = {};
graphs.margin = {top: 20, right: 20, bottom: 30, left: 40};
graphs.width   = 300 - graphs.margin.left - graphs.margin.right;
graphs.height  = 250 - graphs.margin.top - graphs.margin.bottom;

var get_graph = function(yLabel) {
  var x = d3.scale.ordinal().rangeRoundBands([0, graphs.width], .1);
  var y = d3.scale.linear().range([graphs.height, 0]);
  var xAxis = d3.svg.axis().scale(x).orient("bottom");
  var yAxis = d3.svg.axis().scale(y).orient("left").ticks(10,"/s");
  
  var svg = d3.select('#graph-panel').append('svg')
      .attr('width', graphs.width + graphs.margin.left + graphs.margin.right)
      .attr('width', graphs.height + graphs.margin.top + graphs.margin.bottom)
    .append('g')
      .attr('tansform','translate('+graphs.margin+','+graphs.margin+')');
      
  svg.append('g')
      .attr('class','x-axis')
      .attr('transform','translate(0,'+graphs.height+')')
      .call(xAxis);
      
  svg.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
    .append('text')
      .attr('transform','rotate(-90)')
      .attr('y',0) // distance of rotated label from axis
      .attr('dy', '.71em') // similar to previous..? fine tuning?
      .style('text-anchor', 'end') // places at end of axis, rather than ages away
      .text(yLabel);
      
  console.log('svg: '+svg+' \nx: '+x+' \ny: '+y); // the graph
  return {'svg':svg,'x':x,'y':y}; // the graph
};

// data: [{dpid:, value:}]
var update_graph = function(graph, data) {
  graph.x.domain(data.map(function(d) { return d.dpid; }));
  graph.y.domain([0, d3.max(data, function(d) { return d.value; })]);
  
  var chart = graph.svg.selectAll('.bar')
      .data(data); // JOIN
  
  chart.enter().append('rect') // ENTER
      .attr('class', 'bar')
      .attr('width', graph.x.rangeBand());
      
  chart.attr('y', function(d) {
    return graph.y(d.value); }) // ENTER + UPDATE
      .attr('height', function(d) {return graphs.height - graph.y(d.value)})
      .attr('x', function(d) {return graph.x(d.dpid); });
  
  chart.exit().remove(); // EXIT
}

var zipGraphData = function(g_in) { // zips up data, returning an object for each graph
  /*  getGraphData_input = {
        y_labels : ['label_a','label_b'],
        editable : [true,false],
        dpids  : [''],
        series : {
          // How to include the altered input? Should create a stacked graph first
          // label_a = [value: alt_value:,] ?
          label_a = [value:,],
          label_b = [value:,],
          ...
        },
      }
  */
  
  var zipped = [];
  var series = [];
  for (var l = 0; l<g_in.y_labels.length; l++) {
    series[l] = [];
  }
  for (var dp = 0; dp<g_in.dpids.length ; dp++) {
    for (var l = 0; l<g_in.y_labels.length; l++) {
      series[l].push({
        dpid: g_in.dpids[dp],
        value: g_in.series[g_in.y_labels[l]][dp],
      });
    }
  }
  for (var l = 0; l<g_in.y_labels.length; l++) {
    zipped.push ({
      label: g_in.y_labels[l],
      data: series[l],
      editable: g_in.editable[l],
    });
  }
  return zipped;
}




var graph_panel = {
  width: 300
}

var graph_in = {
  labels: [ 'service_rate', 'arrival_rate', 'load' ],
  series_arrival: [
    {'dpid': '0000000000000001','value':20000},
    {'dpid': '0000000000000002','value':28000},
    {'dpid': '0000000000000003','value':11000},
    {'dpid': '0000000000000004','value':10000},
    {'dpid': '0000000000000005','value':30000},
    {'dpid': '0000000000000006','value':18000},
    {'dpid': '0000000000000007','value':15000}],
  series_service: [
    {'dpid': '0000000000000001','value':56625},
    {'dpid': '0000000000000002','value':56625},
    {'dpid': '0000000000000003','value':56625},
    {'dpid': '0000000000000004','value':56625},
    {'dpid': '0000000000000005','value':56625},
    {'dpid': '0000000000000006','value':56625},
    {'dpid': '0000000000000007','value':56625}],
  series_load: []
}

for (var i = 0; i < graph_in.series_service.length; i++) {
  graph_in.series_load.push({
    'dpid':  graph_in.series_service[i].dpid,
    'value': graph_in.series_arrival[i].value/graph_in.series_service[i].value
  });
}




/* var drawGraph = function() { // previous attempt
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
}*/

