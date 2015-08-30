
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

var update_gui_text = function (in_data, out_data) {
    elem.stats.selectAll(".dpid").text(  function(d) {
            return "dpid:    "+dpid_to_int(d.dpid); });
    elem.stats.selectAll(".lambda").text(  function(d) { 
            var o = in_data[d.dpid].arrival_rate;
            return LAM+":    "+(o.live+o.adjustment).toFixed(2); });
    elem.stats.selectAll(".mu").text(  function(d) { 
            var o = in_data[d.dpid].service_rate;
            return MU+":     "+(o.live+o.adjustment).toFixed(2); });
    elem.stats.selectAll(".sojourn").text(  function(d) { 
            return "sojourn: "+out_data[d.dpid].sojourn.toFixed(4); });
    elem.stats.selectAll(".load").text(  function(d) { 
            return "load:    "+out_data[d.dpid].load.toFixed(4); });
    elem.stats.selectAll(".bufflen").text(  function(d) { 
            return "length:  "+out_data[d.dpid].length.toFixed(4); });
}

var graphs = {};
graphs.w_border  = 300;
graphs.h_border  = 250;
graphs.margin  = {top: 20, right: 20, bottom: 30, left: 40};
graphs.width   = 300 - graphs.margin.left - graphs.margin.right;
graphs.height  = 250 - graphs.margin.top - graphs.margin.bottom;

var get_graph = function(yLabel) {
  var x = d3.scale.ordinal().rangeRoundBands([0, graphs.width], .1);
  var y = d3.scale.linear().range([graphs.height, 0]);
  var xAxis = d3.svg.axis().scale(x).orient("bottom");
  var yAxis = d3.svg.axis().scale(y).orient("left").ticks(10);
  
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
      
  return {'svg':svg,'x':x,'y':y,'label':yLabel}; // the graph
};

// data: [{dpid:, value:{live:, adjustment:}] // TODO include and show adjustment
var update_graph = function(graph, data) {
  /* Allows two forms of data to exist, 'value' and {live,adjustment} */
  
  // console.log(graph.label+" "+JSON.stringify(data,null,2));
  
  var get_live = function(o) {
    if (o.value.hasOwnProperty('adjustment')) {
      return o.value.live;
    }
    else return o.value;
  }
  var get_adj_y = function(o) { // max{ (y + adj), y }
    if (o.value.hasOwnProperty('adjustment')) {
      var al = o.value.live + o.value.adjustment;
      if (al < o.value.live) return o.value.live;
      return al;
    }
    else return 0;
  }
  var get_adj_height = function(o) {
    if (!o.value.hasOwnProperty('adjustment'))  return 0;
    
    var live = get_live(o);
    var adj = get_adj_y(o);
    
    // console.log("live("+live+") === adj("+adj+"), return 0"); // no adjustment, adjustment == 0
    
    if (live == adj) return 0; // no adjustment, adjustment == 0
    
    return o.value.adjustment;
  }
  
  graph.x.domain(data.map(function(d) { return d.dpid; }));
  // graph.y.domain([-1, d3.max(data, function(d) { return (get_live(d)+1)*1.2; })]); /* TODO better upper limit */
  graph.y.domain([0, d3.max(data, function(d) { return get_live(d); })]);
  
  /* Live and model data */
  var chart = graph.svg.selectAll('.live')
      .data(data); // JOIN
  
  chart.enter().append('rect') // ENTER
      .attr('class', 'bar live')
      .attr('width', graph.x.rangeBand());
      
  chart.attr('y', function(d) {return graph.y(get_live(d)); }) // ENTER + UPDATE
      .attr('height', function(d) {return graphs.height - graph.y(get_live(d))})
      .attr('x', function(d) {return graph.x(d.dpid); });
  
  chart.exit().remove(); // EXIT
  
  /* Adjusted data */
  var adj = graph.svg.selectAll('.adj')
      .data(data); // JOIN
  
  adj.enter().append('rect') // ENTER
      .attr('class', 'bar adj')
      .attr('width', graph.x.rangeBand());
      
  adj.attr('y', function(d) {return graph.y(get_adj_y(d)); }) // ENTER + UPDATE
      .attr('height', function(d) {
          console.log(graphs.height+" - graph.y("+get_adj_height(d)+")");
          return (graphs.height - graph.y(get_adj_height(d))); })
      .attr('x', function(d) {return graph.x(d.dpid); });
  
  adj.exit().remove(); // EXIT
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
  
  // console.log(JSON.stringify(g_in,null,2));
  
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

// bar chart: http://bl.ocks.org/mbostock/3885304
// dynamic update pattern: http://bl.ocks.org/mbostock/3808218
