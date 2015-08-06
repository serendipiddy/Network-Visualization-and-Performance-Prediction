
// var ws = new WebSocket("ws://" + location.host + "/v1.0/performance/ws");
// ws.onmessage = function(event) {
    // // Process the data received
    // var data = JSON.parse(event.data);
    
    // var state = event.data;
    // console.log("WS.ONMESSAGE()"+state);

    // // create and send RPC reply
    // // var result = rpc[data.method](data.params);
    // var result = "";
    // var ret = {"id": data.id, "jsonrpc": "2.0", "result": result};
    // this.send(JSON.stringify(ret));
    
    // // display the data on the screen
        // // d3.json("/performance/port/" + dpid, function(e, data) {
        // // flows = state;
    // // console.log("STATE:"+state);
    // // elem.console.selectAll("p")  // remove existing
        // // .remove();
    // // p = elem.console.append("p")
        // // .selectAll("p");         // replace them
    // // console.log(p.data(state, null, " ")));
    // // p.data(state).enter()
        // // .append("p")
        // // .text(function (d) { return d });
        // // .text(function (d) { return JSON.stringify(d, null, " ") });
        // // });
// }