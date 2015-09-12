
/* Layout functions */
var menu_addDp = function(dpid) {
    var op = $('<option></option>').attr('value',dpid).text(dpid);
    $('#node-select').append(op);
}

var populateListNum = function(select, data, sel) {
    var items = [];
    $.each(data, function (id, option) {
        if ($.inArray(id,sel)>=0 || sel.length==0) {
            items.push('<li>'+id+':    '+option.toFixed(6)+'</li>');
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
        // pf_data.set_adjustment(dpid, 'arrival_rate', $('#arrival-rate').val());
        spanningtree.adjust_traffic($('#arrival-rate').val(),spanningtree[$('#select-cascade :selected').attr('val')],pf_data);
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
        // if (val < 0) val = 0;
        val = Math.round(val);
        pf_data.set_adjustment(dpid, 'queue_capacity', val);
        console.log('adjusted queue capacity');
        populateDPSpecs(dpid);
    });
    $('#select-cascade').change(function() {
        var alg = $('#select-cascade :selected').attr('val');
        spanningtree.adjust_traffic($('#arrival-rate').val(),spanningtree[alg],pf_data);
        console.log('changed cascade to '+alg);
    });
}

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
        populateDPSpecs(select.val());
        $('#specs').show();
    });
    setControlPanelListeners();
});

var update_gui_text = function (in_data, out_data) {
    elem.stats.selectAll(".dpid").text(    function(d) {
        return "dpid:        "+dpid_to_int(d.dpid); });
    elem.stats.selectAll(".lambda").text(    function(d) { 
        var o = in_data[d.dpid].arrival_rate;
        return LAM+":        "+(o.live+o.adjustment).toFixed(2); });
    elem.stats.selectAll(".mu").text(    function(d) { 
        var o = in_data[d.dpid].service_rate;
        return MU+":         "+(o.live+o.adjustment).toFixed(2); });
    elem.stats.selectAll(".sojourn").text(    function(d) { 
        return "sojourn: "+out_data[d.dpid].sojourn.toFixed(4); });
    elem.stats.selectAll(".load").text(    function(d) { 
        return "load:        "+out_data[d.dpid].load.toFixed(4); });
    elem.stats.selectAll(".bufflen").text(    function(d) { 
        return "length:    "+out_data[d.dpid].length.toFixed(4); });
}

var graphs = {};
graphs.w_border    = 300;
graphs.h_border    = 250;
graphs.margin    = {top: 20, right: 20, bottom: 30, left: 40};
graphs.width     = 300 - graphs.margin.left - graphs.margin.right;
graphs.height    = 250 - graphs.margin.top - graphs.margin.bottom;

var get_graph = function(yLabel) {
    var x = d3.scale.ordinal().rangeRoundBands([0, graphs.width], .1);
    var y = d3.scale.linear().range([graphs.height, 0]);
    var xAxis = d3.svg.axis().scale(x).orient("bottom");
    var yAxis = d3.svg.axis().scale(y).orient("left").ticks(10);
    
    
    var color = d3.scale.ordinal()
        .range(["SteelBlue","YellowGreen", "OrangeRed"]);
    
    
    var svg = d3.select('#graph-panel').append('svg')
        .attr('width', graphs.width + graphs.margin.left + graphs.margin.right)
        .attr('height', graphs.height + graphs.margin.top + graphs.margin.bottom)
      .append('g')
        .attr('transform','translate('+graphs.margin.left+','+graphs.margin.top+')');
            
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
            
    return {'svg':svg,'x':x,'y':y,'label':yLabel,'color':color}; // the graph
};

// data: [{dpid:, value:{live:, adjustment:}] // TODO include and show adjustment
var update_graph = function(graph, data) {
    /* Allows two forms of data to exist, 'value' and {live,adjustment} */
    
    // console.log(graph.label+" "+JSON.stringify(data,null,2));
    // console.log('======'+graph.label+'======');
    
    graph.color.domain(['live','adjustment_pos','adjustment_neg']);
    data.forEach(function(d) {
        var y0 = 0;
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
    graph.y.domain([0, d3.max(data, function(d) { return d.total; })]);
    
    
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
        .attr('width', graph.x.rangeBand());
            
    // ENTER + UPDATE
    bars.attr("y", function(d) { return graph.y(d.y1); })
        .attr("height", function(d) { return graph.y(d.y0) - graph.y(d.y1); })
        // .attr("transform", function(d) { if(d.name === 'adjustment_neg') return 'translate(3,0)'; return 'translate(0,0)'})
        .style("fill", function(d) { return graph.color(d.name); });

}

var zipGraphData = function(g_in) { // zips up data, returning an object for each graph
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
}

// bar chart: http://bl.ocks.org/mbostock/3885304
// dynamic update pattern: http://bl.ocks.org/mbostock/3808218
// stacked data: http://bl.ocks.org/mbostock/3886208