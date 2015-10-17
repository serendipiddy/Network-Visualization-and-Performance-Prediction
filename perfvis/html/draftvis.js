
$(document).ready(function() {
    var select = $('#node-select')
    select.change(function() {
        if (select.val() === 'default') {
            $('#specs').hide();
            return;
        }
        else {
          spanningtree.create_tree(select.val(),pf_data.live_data);
        }
        vis.populateDPSpecs(select.val());
        $('#specs').show();
    });
    vis.setControlPanelListeners();
    var smoothing = pf_data.exponSmoothing;
    graphing.create_graphs(graphs_to_create.input,graphs_to_create.output);
    
    // sort dpids
    // $("#node-select").html($("#node-select option").sort(function (a, b) {
          // return a.text == b.text ? 0 : a.text < b.text ? -1 : 1
      // }))
});

// var vis = {
var graphs_to_create = {
  input: ['service_rate', 'arrival_rate', 'queue_capacity'],
  output: ['load','sojourn','packet_loss']
}

/* Graphing currently connects to the GUI vis file 
    graphing.create_graphs(in,out) must be called first, call */
var graphing = {
  graphs: [],
  pf_labels: [],
  model_labels: [],
  create_graphs: function(pf_labels, model_labels){
    this.graphs = [];
    this.pf_labels = [];
    this.model_labels = [];
    for (var l = 0; l<pf_labels.length; l++) {
      this.graphs.push(vis.get_graph(pf_labels[l]));
      this.pf_labels.push(pf_labels[l]);
    }
    for (var l = 0; l<model_labels.length; l++) {
      this.graphs.push(vis.get_graph(model_labels[l]));
      this.model_labels.push(model_labels[l]);
    }
  },
  get_graph_data: function (pf_out, model_data) {
    /* for each input/output display a graph grouping like-puts */
    
    /* Construct zipGraphData() input */
    var graph_data = {
      y_labels: [],
      editable: [],
      dpids: [],
      series: {}
    };
    
    for (var i = 0; i< this.pf_labels.length; i++)  {
      graph_data.y_labels.push(this.pf_labels[i]);
      graph_data.editable.push(true);
      graph_data.series[this.pf_labels[i]] = [];
    }
    for (var i = 0; i< this.model_labels.length; i++) {
      graph_data.y_labels.push(this.model_labels[i]);
      graph_data.editable.push(false);
      graph_data.series[this.model_labels[i]] = [];
    }
    
    for (var dpid in pf_out) {
      graph_data.dpids.push(dpid);
      for (var i = 0; i< this.pf_labels.length; i++) {
        var lab = this.pf_labels[i];
        graph_data.series[lab]
          .push(pf_out[dpid][lab]);
      }
      for (var i = 0; i< this.model_labels.length; i++) {
        var lab = this.model_labels[i];
        graph_data.series[lab]
          .push(model_data[dpid][lab]);
      }
    }
    
    // console.log(JSON.stringify(graph_data,null,2));
    
    return this.zipGraphData(graph_data);
  },
  update_graphs: function (pf_out, model_data) {
    var data = this.get_graph_data(pf_out, model_data);
    for(var i = 0; i<this.graphs.length; i++) {
      vis.update_graph(this.graphs[i],data[i].data);
    }
  },
  zipGraphData: function(g_in) { // zips up data, returning an object for each graph
    /*    getGraphData_input = {
        y_labels : ['label_a','label_b'],
        editable : [true,false],
        dpids    : [''],
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
  },
}

/* Select the data to graph */
var update_gui = function (is_adjustment) { /* Updates the displayed performance values */
    if(!is_adjustment) measure_latency.event_occured('update_gui()_begin','');
    var in_data  = pf_data.get_gui_input_all();
    if(!is_adjustment) measure_latency.event_occured('get_input','');
    var model_data = model.get_output_all();
    if(!is_adjustment) measure_latency.event_occured('get_model','');
    
    // console.log(JSON.stringify(in_data,null,2))
    
    vis.update_gui_text(in_data,model_data);
    if(!is_adjustment) measure_latency.event_occured('gui_text','');
    graphing.update_graphs(in_data,model_data);
    if(!is_adjustment) measure_latency.event_occured('update_graphs','');
    if(!is_adjustment) measure_latency.event_occured('update_gui()_end','');
    
    vis.update_live_arrival_value();
}

var vis = {
  /* Layout functions */
  menu_addDp: function(dpid) {
      var op = $('<option></option>').attr('value',dpid).text(dpid);
      $('#node-select').append(op);
      /* slows initial load significantly.. */
      // $("#node-select").html($("#node-select option").sort(function (a, b) {
          // return a.text == b.text ? 0 : a.text < b.text ? -1 : 1
      // }))
  },
  topo_view: true,
  toggleTopo: function() {
    this.topo_view = ! this.topo_view;
    if (this.topo_view) {
      $('#view-topo').attr('style','display:block');
      $('#view-perf').attr('style','display:none');
    }
    else {
      $('#view-perf').attr('style','display:block');
      $('#view-topo').attr('style','display:none');
    }
  },
  populateDPSpecs: function (dpid) {
      // var specs = $('#specs');
      if (dpid === 'default') return;
      
      var data = pf_data.node_data[dpid];
      var live = pf_data.live_data[dpid];
      $('#select-brand').val(data.switch_brand);
      $('#select-model').val(data.queueing_model);
      
      $('#arrival-rate').val(data.adjustments['arrival_rate'].toFixed(0));
      $('#service-rate').val(data.adjustments['service_rate'].toFixed(0));
      $('#queue-capacity').val(data.adjustments['queue_capacity']);
      
      $('#node-arrival-rate').html(live.aggregate.arrival_rate);
      $('#node-service-rate').html(data.service_rate);
      $('#queue-capacity-num').html(data.queue_capacity);
      
      // populateListNum($('#switch-output'),data.output,[]);
      update_gui(true);
  },
  update_live_arrival_value: function () {
      var dpid = $('#node-select').val();
      if (dpid === 'default') return;
      var live = pf_data.live_data[dpid];
      $('#node-arrival-rate').html(live.aggregate.arrival_rate);
  },
  setControlPanelListeners: function() {
      // var dpid = $('#node-select').val(); // cannot be here -> closure.. dpid == default OTL
      $('#select-brand').change(function() {
          var dpid = $('#node-select').val();
          console.log(dpid);
          pf_data.set_config(dpid, 'switch_brand', $('#select-brand').val());
          vis.populateDPSpecs(dpid);
      });
      $('#select-model').change(function() {
          var dpid = $('#node-select').val();
          pf_data.set_config(dpid, 'queueing_model', $('#select-model').val());
          vis.populateDPSpecs(dpid);
      });
      $('#arrival-rate').change(function() {
          if ($('#arrival-rate').val() === '')
            return;
          var dpid = $('#node-select').val();
          // pf_data.set_adjustment(dpid, 'arrival_rate', $('#arrival-rate').val());
          var alg = $('#select-cascade :selected').attr('val');
          spanningtree.adjust_traffic($('#arrival-rate').val(), spanningtree[alg],pf_data);
          console.log('adjusted arrival');
          vis.populateDPSpecs(dpid);
      });
      $('#service-rate').change(function() {
          if ($('#arrival-rate').val() === '')
            return;
          var dpid = $('#node-select').val();
          pf_data.set_adjustment(dpid, 'service_rate', $('#service-rate').val());
          console.log('adjusted service');
          vis.populateDPSpecs(dpid);
      });
      $('#queue-capacity').change(function() {
          var dpid = $('#node-select').val();
          var val = $('#queue-capacity').val();
          // if (val < 0) val = 0;
          val = Math.round(val);
          pf_data.set_adjustment(dpid, 'queue_capacity', val);
          console.log('adjusted queue capacity');
          vis.populateDPSpecs(dpid);
      });
      $('#select-cascade').change(function() {
          var dpid = $('#node-select').val();
          var alg = $('#select-cascade :selected').attr('val');
          spanningtree.adjust_traffic($('#arrival-rate').val(), spanningtree[alg],pf_data);
          console.log('changed cascade to '+alg);
          console.log('populateDPspecs: '+dpid);
          vis.populateDPSpecs(dpid);
      });
  },
  clearAdjustments: function() {
    console.log('clearing adjustments in gui');
    pf_data.clearAdjustments();
    var dpid = $('#node-select').val();
    this.populateDPSpecs(dpid);
  },
  smoothing: '',
  setExponSmoothing: function() {
    if (this.smoothing) {
      pf_data.setExponSmoothing(false, 100);
    }
    else {
      pf_data.setExponSmoothing(true, 0.5);
    }
  },
  set_gui_text: function (e, toponodes) {
      e.stats = e.stats.data(toponodes);
      e.stats.exit().remove(); // makes stats disappear with the topology
      var statEnter = e.stats.enter().append("g")
          .attr("class","stats"); // this is where the interactivity will be added
          
      statEnter.append("text").attr("class","dpid")
          .attr("x",20).attr("y",-40).text(function(d) {return "dpid:"+dpid_to_int(d.dpid);});
          
      var default_val = ".";
          
      statEnter.append("text").attr("class","lambda")
          .attr("x",25).attr("y",-25).text(LAM+": "+default_val);
      statEnter.append("text").attr("class","mu")
          .attr("x",85).attr("y",-25).text(MU+": "+default_val);
      statEnter.append("text").attr("class","capacity")
          .attr("x",25).attr("y",-10).text("capacity: "+default_val);
      statEnter.append("text").attr("class","pnf")
          .attr("x",100).attr("y",-10).text("pnf: "+default_val);
          
      // statEnter.append("text").attr("class","rx")
          // .attr("x",30).attr("y",10).text("Rx:  "+default_val);
      // statEnter.append("text").attr("class","total")
          // .attr("x",90).attr("y",10).text("Total:  "+default_val);
          
      statEnter.append("text").attr("class","sojourn")
          .attr("x",25).attr("y",10).text("sojourn: "+default_val);
      statEnter.append("text").attr("class","load")
          .attr("x",25).attr("y",25).text("load: "+default_val);
      statEnter.append("text").attr("class","bufflen")
          .attr("x",25).attr("y",40).text("length: "+default_val);
      statEnter.append("text").attr("class","packet_loss")
          .attr("x",25).attr("y",55).text("");
          
  },
  update_gui_text: function (in_data, out_data) {
      elem.stats.selectAll(".dpid").text(    function(d) {
          return "dpid:        "+dpid_to_int(d.dpid); });
      /* input */
      elem.stats.selectAll(".lambda").text(    function(d) { 
          var o = in_data[d.dpid].arrival_rate;
          return LAM+":        "+(o.live+o.adjustment).toFixed(0)+"/s"; });
      elem.stats.selectAll(".mu").text(    function(d) { 
          var o = in_data[d.dpid].service_rate;
          return MU+":         "+(o.live+o.adjustment).toFixed(0)+"/s"; });
      elem.stats.selectAll(".capacity").text(    function(d) { 
          var o = in_data[d.dpid].queue_capacity;
          return "capacity:    "+(o.live+o.adjustment).toFixed(0); });
      elem.stats.selectAll(".pnf").text(    function(d) { 
          var o = in_data[d.dpid].pnf;
          return "pnf: "+((o.live+o.adjustment)*100).toFixed(2)+"%"; });
          
      /* output */
      elem.stats.selectAll(".sojourn").text(    function(d) { 
          return "sojourn: "+(out_data[d.dpid].sojourn*config.sojourn_scale).toFixed(4)+MU+"s"; });// mus = microsecond
      elem.stats.selectAll(".load") .text(    function(d) { 
          return "load:        "+(out_data[d.dpid].load*100).toFixed(4)+"%"; });
      elem.stats.selectAll(".bufflen").text(    function(d) { 
          return "length:    "+out_data[d.dpid].length.toFixed(4)+"packets"; });
      elem.stats.selectAll(".packet_loss").text(    function(d) { 
          if (!out_data[d.dpid].hasOwnProperty('packet_loss')) return "";
          return "packet_loss:    "+out_data[d.dpid].packet_loss.toFixed(4)+"packets"; });
      
      /* make switch red with load > 1 */
      elem.node.selectAll('.switch-circle').attr( 'fill', function(d) {
        var dpid = d.dpid;
        if (out_data[dpid].load >= 1) {
          return 'red';
        }
        return 'white';
      }); 
  },

  graphs: {
    w_border: sample.switches.length > 250 ? sample.switches.length + 100 : 300,
    h_border: 250,
    margin:   {top: 15, right: 20, bottom: 20, left: 60},
    init: function() {
      this.width= this.w_border - this.margin.left - this.margin.right;
      this.height= 100 - this.margin.top - this.margin.bottom;
    }
  },
  get_y_domain: function(ylabel) {
    if (ylabel === 'load') return [0,1.5];
    if (ylabel === 'service_rate') return [0.1, 120000];
    if (ylabel === 'arrival_rate') return [0, 120000];
    if (ylabel === 'sojourn') return [0, 0.0002];
    if (ylabel === 'packet_loss') return [0, 10];
    if (ylabel === 'queue_capacity') return [0, 512];
    return [0, 1];
  },
  get_graph: function(yLabel) {
      this.graphs.init();
      // var x = d3.scale.ordinal().rangeRoundBands([0, graphs.width], 0.2);
      var x = d3.scale.ordinal()
          // .domain([1,2,3,4,5])
          // .domain()
          .rangeRoundBands([0, this.graphs.width], 0.2);
      var y = d3.scale.linear()
          .domain(this.get_y_domain(yLabel))
          .range([this.graphs.height, 0]);
      var xAxis = d3.svg.axis().scale(x).orient("bottom");
      var yAxis = d3.svg.axis().scale(y).orient("left").ticks(5);
      
      var color = d3.scale.ordinal()
          // .range(["SteelBlue","YellowGreen", "OrangeRed"]);
          .range(["SteelBlue","YellowGreen", "White"]);
      
      var svg = d3.select('#graph-panel').append('svg')
          .attr('width', this.graphs.width + this.graphs.margin.left + this.graphs.margin.right)
          .attr('height', this.graphs.height + this.graphs.margin.top + this.graphs.margin.bottom)
        .append('g')
          .attr('transform','translate('+this.graphs.margin.left+','+this.graphs.margin.top+')');
              
      svg.append('g')
          .attr('class','x-axis')
          .attr('transform','translate(0,'+this.graphs.height+')')
          .call(xAxis);
              
      svg.append('g')
          .attr('class', 'y-axis')
          .call(yAxis);
          
      svg.append('text')
          // .attr('transform','rotate(-90)')
          .attr('transform','translate(0,-15)')
          .attr('y',0) // distance of rotated label from axis
          .attr('dy', '.71em') // similar to previous..? fine tuning?
          // .style('text-anchor', 'end') // places at end of axis, rather than ages away
          .style('font-size','15px')
          .text(yLabel);
              
      return {'svg':svg,'x':x,'y':y,'label':yLabel,'color':color}; // the graph
  },
  // data: [{dpid:, value:{live:, adjustment:}] // TODO include and show adjustment
  update_graph: function(graph, data) {
      /* Allows two forms of data to exist, 'value' and {live,adjustment} */
      
      // console.log(graph.label+" "+JSON.stringify(data,null,2));
      // console.log('======'+graph.label+'======');
      
      graph.color.domain(['live','adjustment_pos','adjustment_neg']);
      data.forEach(function(d) {
          var y0 = 0;
          if (typeof d.value==='undefined') { // Zero graphs for values not output by some node's model
            d.value = {'live':0, 'adjustment':0};
          }
          var adj = d.value.hasOwnProperty('adjustment');
          d.value = ['live','adjustment'].map(
              function(name) {  
                return {
                  name: (adj ? name : 'live'), 
                  y0: y0, 
                  y1: (adj ? (y0 += +d.value[name]) : d.value),
                };});
          d.total = d.value[d.value.length - 1].y1;
          
          // sort and reset the name to be the right colour
          
          if (graph === 'load') {
              // turn rho>1 red
              
          } 
          
          // console.log('pre'+JSON.stringify(d.value));
          if(d.value[0].y1 > d.value[1].y1) {
              d.value[1].name = 'adjustment_neg';
              
              if (d.value[1].y1 < 0) d.value[1].y1 = 0;
              
              var tmp_y = d.value[1].y0;
              d.value[1].y0 = d.value[1].y1;
              d.value[1].y1 = tmp_y;
              
              d.value[0].y1 = d.value[1].y0;
              
              var tmp_datum = d.value[0];
              d.value[0] = d.value[1];
              d.value[1] = tmp_datum;
          }
          else if (adj) d.value[1].name = 'adjustment_pos';
          // console.log('pst'+JSON.stringify(d.value));
      });
      
      graph.x.domain(data.map(function(d) { return d.dpid; }));

      /* Live and model data */
      var chart = graph.svg.selectAll('.dp')
          .data(data); // JOIN
          
      chart.exit().remove(); // EXIT -- IMPORTANT THE SELECT AND APPENDED THING MATCH FOR EXIT
          
      chart.enter().append('g')
          .attr('class','dp')   // -- MATCHES THIS CLASS HERE
          .attr("transform", function(d) { return "translate(" + graph.x(d.dpid) + ",0)"; });

          
      var bars = chart.selectAll('rect')
          .data(function(d) { return d.value; });
          
      bars.enter().append('rect') // ENTER
          .attr('class', 'bar')
          .attr('width', function(d) {
              // if (d.name === 'adjustment_neg') return graph.x.rangeBand()-100;
              return graph.x.rangeBand();
          });
              
      // ENTER + UPDATE
      bars.attr("y", function(d) { return graph.y(d.y1); })
          .attr("height", function(d) { return graph.y(d.y0) - graph.y(d.y1); })
          // .attr("transform", function(d) { if(d.name === 'adjustment_neg') return 'translate(3,0)'; return 'translate(0,0)'})
          .attr("stroke-width", function(d) { 
              if (d.name === 'adjustment_neg') return 1;
              return 0; }
          )
          .attr("stroke", function(d) { 
              if (d.name === 'adjustment_neg') return 'OrangeRed'
              return graph.color(d.name); }
          )
          .style("fill", function(d) { return graph.color(d.name); });
  },
}

// bar chart: http://bl.ocks.org/mbostock/3885304
// dynamic update pattern: http://bl.ocks.org/mbostock/3808218
// stacked data: http://bl.ocks.org/mbostock/3886208
