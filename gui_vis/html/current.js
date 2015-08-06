
var button = function() {
  d3.json("v1.0/performance/current", function(error, stats) {
    // console.log(stats);
    h = JSON.stringify(stats,null,2);
    document.getElementById("stats").innerHTML = h;
  });
}
