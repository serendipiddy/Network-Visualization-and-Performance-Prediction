
var pullData = function() {
  d3.json("v1.0/performance/current", function(error, stats) {
    // console.log(stats);
    // document.getElementById("stats").innerHTML = h;
    
    var stats_array = []
    for (dpid in stats) {
      stats_array.push({dpid:dpid,stats:stats[dpid]})
    }
    
    var panel = d3.select('#stats-panel')
    
    var nodes = panel.selectAll('.node-stats') 
        .data(stats_array);
    
    nodes.attr('class','old-stats');
    
    nodes.enter().append('div')
        .attr('class','node-stats')
        .html(function(d) {
          
          return '<h1>'+d.dpid+'</h1><pre>'+JSON.stringify(d.stats,null,2)+'</pre>';
        });
    
    panel.selectAll('.old-stats').remove();
  });
}

pullData();