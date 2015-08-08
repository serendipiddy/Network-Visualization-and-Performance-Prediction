var CONF = {
    image: {
        width: 50,
        height: 40
    },
    force: {
        width: 960,
        height: 500,
        dist: 200,
        charge: -600
    }
};

var sample = {
  "0000000000000001": [
    {"arrival_rate": 0.8, "rx_packets": 8, "tx_packets": 8, "depart_rate_rate": 1.0, "port_no": 1}, 
    {"arrival_rate": 1.0, "rx_packets": 15, "tx_packets": 8, "depart_rate_rate": 1.0, "port_no": 2}, 
    {"arrival_rate": 0.0, "rx_packets": 0, "tx_packets": 0, "depart_rate_rate": 0.0, "port_no": 4294967294}
  ], 
  "0000000000000002": [
    {"arrival_rate": 1.0, "rx_packets": 8, "tx_packets": 8, "depart_rate_rate": 1.0, "port_no": 1}, 
    {"arrival_rate": 1.0, "rx_packets": 8, "tx_packets": 8, "depart_rate_rate": 1.0, "port_no": 2}, 
    {"arrival_rate": 1.0, "rx_packets": 8, "tx_packets": 8, "depart_rate_rate": 0.8, "port_no": 3}, 
    {"arrival_rate": 0.0, "rx_packets": 0, "tx_packets": 0, "depart_rate_rate": 0.0, "port_no": 4294967294}
  ], 
  "0000000000000003": [
    {"arrival_rate": 0.0, "rx_packets": 11, "tx_packets": 8, "depart_rate_rate": 1.0, "port_no": 1}, 
    {"arrival_rate": 0.0, "rx_packets": 11, "tx_packets": 8, "depart_rate_rate": 1.0, "port_no": 2}, 
    {"arrival_rate": 1.0, "rx_packets": 8, "tx_packets": 8, "depart_rate_rate": 1.0, "port_no": 3}, 
    {"arrival_rate": 0.0, "rx_packets": 0, "tx_packets": 0, "depart_rate_rate": 0.0, "port_no": 4294967294}
  ], 
  "0000000000000004": [
    {"arrival_rate": 0.0, "rx_packets": 11, "tx_packets": 8, "depart_rate_rate": 1.0, "port_no": 1}, 
    {"arrival_rate": 0.0, "rx_packets": 11, "tx_packets": 8, "depart_rate_rate": 1.0, "port_no": 2}, 
    {"arrival_rate": 1.0, "rx_packets": 8, "tx_packets": 8, "depart_rate_rate": 1.0, "port_no": 3}, 
    {"arrival_rate": 0.0, "rx_packets": 0, "tx_packets": 0, "depart_rate_rate": 0.0, "port_no": 4294967294}
  ], 
  "0000000000000005": [
    {"arrival_rate": 1.0, "rx_packets": 15, "tx_packets": 16, "depart_rate_rate": 1.0, "port_no": 1}, 
    {"arrival_rate": 1.0, "rx_packets": 15, "tx_packets": 16, "depart_rate_rate": 1.0, "port_no": 2}, 
    {"arrival_rate": 1.0, "rx_packets": 8, "tx_packets": 15, "depart_rate_rate": 1.0, "port_no": 3}, 
    {"arrival_rate": 0.0, "rx_packets": 0, "tx_packets": 0, "depart_rate_rate": 0.0, "port_no": 4294967294}
  ], 
  "0000000000000006": [
    {"arrival_rate": 0.0, "rx_packets": 11, "tx_packets": 15, "depart_rate_rate": 1.0, "port_no": 1}, 
    {"arrival_rate": 0.0, "rx_packets": 10, "tx_packets": 15, "depart_rate_rate": 1.0, "port_no": 2}, 
    {"arrival_rate": 1.0, "rx_packets": 16, "tx_packets": 15, "depart_rate_rate": 1.0, "port_no": 3}, 
    {"arrival_rate": 0.0, "rx_packets": 0, "tx_packets": 0, "depart_rate_rate": 0.0, "port_no": 4294967294}
  ], 
  "0000000000000007": [
    {"arrival_rate": 0.0, "rx_packets": 10, "tx_packets": 15, "depart_rate_rate": 1.0, "port_no": 1}, 
    {"arrival_rate": 0.0, "rx_packets": 10, "tx_packets": 15, "depart_rate_rate": 1.0, "port_no": 2}, 
    {"arrival_rate": 1.0, "rx_packets": 16, "tx_packets": 15, "depart_rate_rate": 1.0, "port_no": 3}, 
    {"arrival_rate": 0.0, "rx_packets": 0, "tx_packets": 0, "depart_rate_rate": 0.0, "port_no": 4294967294}
  ]
};

var ws = new WebSocket("ws://" + location.host + "/v1.0/topology/ws");
ws.onmessage = function(event) {
    var data = JSON.parse(event.data);
    console.log("WS.ONMESSAGE()"+event.data);

    var result = rpc[data.method](data.params);

    var ret = {"id": data.id, "jsonrpc": "2.0", "result": result};
    this.send(JSON.stringify(ret));
}

var glob = "";
var lambda_char = String.fromCharCode(parseInt("03BB",16));
var controller_port = 4294967294;

/* For receiving performance information */
// current_stats = "";
// current_processed = "";
var ws = new WebSocket("ws://" + location.host + "/v1.0/performance/ws");
ws.onmessage = function(event) {
    // Process the data received
    var data = JSON.parse(event.data);
    
    glob = event;
    
    console.log("Method:"+data.method);

    // create and send RPC reply
    var result = "";
    try {
      result = model_[data.method](data.params[0]);
    } catch(err) {console.log("ERROR"+err);}
    
    var ret = {"id": data.id, "jsonrpc": "2.0", "result": result};
    console.log("Ret: ",JSON.stringify(ret));
    this.send(JSON.stringify(ret));
}

function trim_zero(obj) {
    return String(obj).replace(/^0+/, "");
}

function dpid_to_int(dpid) {
    return Number("0x" + dpid);
}

var elem = {
    force: d3.layout.force()
        .size([CONF.force.width, CONF.force.height])
        .charge(CONF.force.charge)
        .linkDistance(CONF.force.dist)
        .on("tick", _tick),
    svg: d3.select("body").append("svg")
        .attr("id", "topology")
        .attr("width", CONF.force.width)
        .attr("height", CONF.force.height),
    console: d3.select("body").append("div")
        .attr("id", "console")
        .attr("width", CONF.force.width),
};
function _tick() {
    elem.link.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    elem.node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
    elem.stats.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
    elem.port.attr("transform", function(d) {
        var p = topo.get_port_point(d);
        return "translate(" + p.x + "," + p.y + ")";
    });
}
elem.drag = elem.force.drag().on("dragstart", _dragstart);
function _dragstart(d) {
    var dpid = dpid_to_int(d.dpid)
    // d3.json("/stats/port/" + dpid, function(e, data) {
    d3.json("/v1.0/performance/current", function(e, data) {
        // flows = data[dpid];
        flows = data[d.dpid];
        console.log("PORTS:"+JSON.stringify(flows));
        // console.log("FLOWS:"+JSON.stringify(flows[1]));
        elem.console.selectAll("p")
            .remove();
        p = elem.console.append("p")
            // .append("P")
            // .text(function (d) { return JSON.stringify(d); }); // only use d what .data(where_the_d_comes_from) is used
            .text(function() {
              return JSON.stringify(flows);
            });
    });
    
    // d3.json("/stats/flow/" + dpid, function(e, data) {
        // flows = data[dpid];
        // console.log(flows);
        // elem.console.selectAll("ul").remove();
        // li = elem.console.append("ul")
            // .selectAll("li");
        // li.data(flows).enter().append("li")
            // .text(function (d) { return JSON.stringify(d, null, " "); });
    // });
    
    d3.select(this).classed("fixed", d.fixed = true);
}
elem.node = elem.svg.selectAll(".node");
elem.link = elem.svg.selectAll(".link");
elem.port = elem.svg.selectAll(".port");
elem.stats = elem.svg.selectAll(".stats");
elem.update = function () {
    this.force
        .nodes(topo.nodes)
        .links(topo.links)
        .start();

    /* Links */
    this.link = this.link.data(topo.links);
    this.link.exit().remove();
    this.link.enter().append("line")
        .attr("class", "link");

    /* Switches */
    this.node = this.node.data(topo.nodes);
    this.node.exit().remove();
    var nodeEnter = this.node.enter().append("g")
        .attr("class", "node")
        .on("dblclick", function(d) { d3.select(this).classed("fixed", d.fixed = false); })
        .call(this.drag);
    nodeEnter.append("image")
        .attr("xlink:href", "./router.svg")
        .attr("x", -CONF.image.width/2)
        .attr("y", -CONF.image.height/2)
        .attr("width", CONF.image.width)
        .attr("height", CONF.image.height);
    nodeEnter.append("text")
        .attr("dx", -CONF.image.width/2)
        .attr("dy", CONF.image.height-10)
        .text(function(d) { return "dpid: " + trim_zero(d.dpid); });

    /* Statistics */
    this.stats = this.stats
      .data(topo.nodes);
      // .data(process_data(topo.nodes,"undefined"));
    var statEnter = this.stats.enter().append("g")
        .attr("class","stats"); // this is where the interactivity will be added
    statEnter.append("text").attr("class","dpid")
        .attr("x",30)
        .attr("y",-20)
        .text(function(d) {return "dpid:"+dpid_to_int(d.dpid);});
    statEnter.append("text").attr("class","rx_packets")
        .attr("x",30)
        .attr("y",-5)
        .text("Rx:  (loading..)");
    statEnter.append("text").attr("class","lambda")
        .attr("x",30)
        .attr("y",10)
        .text(lambda_char+": (loading..)");
    statEnter.append("text").attr("class","controllerTx")
        .attr("x",30)
        .attr("y",25)
        .text("to_ctrl: (loading..)");
    statEnter.append("text").attr("class","sojourn")
        .attr("x",30)
        .attr("y",40)
        .text("sojourn: (loading..)");
        
    /* Ports */
    var ports = topo.get_ports();
    this.port.remove();
    
    this.port = this.svg.selectAll(".port").data(ports);
    var portEnter = this.port.enter().append("g")
        .attr("class", "port");
    portEnter.append("circle")
        .attr("r", 8);
    portEnter.append("text")
        .attr("dx", -3)
        .attr("dy", 3)
        .text(function(d) { return trim_zero(d.port_no)+" "; });
};

function is_valid_link(link) {
    return (link.src.dpid < link.dst.dpid)
}

var topo = {
    nodes: [],
    links: [],
    node_index: {}, // dpid -> index of nodes array
    initialize: function (data) {
        this.add_nodes(data.switches);
        this.add_links(data.links);
    },
    add_nodes: function (nodes) {
        for (var i = 0; i < nodes.length; i++) {
            this.nodes.push(nodes[i]);
        }
        this.refresh_node_index();
    },
    add_links: function (links) {
        for (var i = 0; i < links.length; i++) {
            if (!is_valid_link(links[i])) continue;
            console.log("add link: " + JSON.stringify(links[i]));

            var src_dpid = links[i].src.dpid;
            var dst_dpid = links[i].dst.dpid;
            var src_index = this.node_index[src_dpid];
            var dst_index = this.node_index[dst_dpid];
            var link = {
                source: src_index,
                target: dst_index,
                port: {
                    src: links[i].src,
                    dst: links[i].dst
                }
            }
            this.links.push(link);
        }
    },
    delete_nodes: function (nodes) {
        for (var i = 0; i < nodes.length; i++) {
            console.log("delete switch: " + JSON.stringify(nodes[i]));

            node_index = this.get_node_index(nodes[i]);
            this.nodes.splice(node_index, 1);
        }
        this.refresh_node_index();
    },
    delete_links: function (links) {
        for (var i = 0; i < links.length; i++) {
            if (!is_valid_link(links[i])) continue;
            console.log("delete link: " + JSON.stringify(links[i]));

            link_index = this.get_link_index(links[i]);
            this.links.splice(link_index, 1);
        }
    },
    get_node_index: function (node) {
        for (var i = 0; i < this.nodes.length; i++) {
            if (node.dpid == this.nodes[i].dpid) {
                return i;
            }
        }
        return null;
    },
    get_link_index: function (link) {
        for (var i = 0; i < this.links.length; i++) {
            if (link.src.dpid == this.links[i].port.src.dpid &&
                    link.src.port_no == this.links[i].port.src.port_no &&
                    link.dst.dpid == this.links[i].port.dst.dpid &&
                    link.dst.port_no == this.links[i].port.dst.port_no) {
                return i;
            }
        }
        return null;
    },
    get_ports: function () {
        var ports = [];
        var pushed = {};
        for (var i = 0; i < this.links.length; i++) {
            function _push(p, dir) {
                key = p.dpid + ":" + p.port_no;
                if (key in pushed) {
                    return 0;
                }

                pushed[key] = true;
                p.link_idx = i;
                p.link_dir = dir;
                return ports.push(p);
            }
            _push(this.links[i].port.src, "source");
            _push(this.links[i].port.dst, "target");
        }

        return ports;
    },
    get_port_point: function (d) {
        var weight = 0.88;

        var link = this.links[d.link_idx];
        var x1 = link.source.x;
        var y1 = link.source.y;
        var x2 = link.target.x;
        var y2 = link.target.y;

        if (d.link_dir == "target") weight = 1.0 - weight;

        var x = x1 * weight + x2 * (1.0 - weight);
        var y = y1 * weight + y2 * (1.0 - weight);

        return {x: x, y: y};
    },
    refresh_node_index: function(){
        this.node_index = {};
        for (var i = 0; i < this.nodes.length; i++) {
            this.node_index[this.nodes[i].dpid] = i;
        }
    },
}

var rpc = {
    event_switch_enter: function (params) {
        var switches = [];
        for(var i=0; i < params.length; i++){
            switches.push({"dpid":params[i].dpid,"ports":params[i].ports});
        }
        topo.add_nodes(switches);
        elem.update();
        return "";
    },
    event_switch_leave: function (params) {
        var switches = [];
        for(var i=0; i < params.length; i++){
            switches.push({"dpid":params[i].dpid,"ports":params[i].ports});
        }
        topo.delete_nodes(switches);
        elem.update();
        return "";
    },
    event_link_add: function (links) {
        topo.add_links(links);
        elem.update();
        return "";
    },
    event_link_delete: function (links) {
        topo.delete_links(links);
        elem.update();
        return "";
    },
}

var model_ = {
    model_nodes: {}, 
    var process_stats: function process_data(nodes, stats) {
        /* Create this.model_nodes */
        for (s in stats) {
          model_nodes[s] = {};
        }
        
        if (nodes.length != model_nodes.length) {
          console.log("error, node and stat lengths differ");
          return 0;
        }
        
        // TODO add one node for the controller
        
        /* Populate the node structure with the ports info?       >>>  LLINK */
        for (var i = 0; i < nodes.length; i++) { 
          var dpid = nodes[i].dpid;
          var n = {};  // for each node
          data = stats[dpid]; // data = {"arrival_rate": 0.8, "rx_packets": 8, "tx_packets": 8, "depart_rate_rate": 1.0, "port_no": 1}, 
          
          // for now, simply aggregate the stats of each switch
          
          n.arrival_rate = 0;
          n.depart_rate  = 0;
          n.rx = 0;
          n.tx = 0;
          
          /* Compute this in the model itself.. pass it the ports to deal with!        <<< LLINK */
          for (var p = 0; p < data.length; p++) {
            n.arrival_rate += data[i].arrival_rate;
            n.depart_rate  += data[i].depart_rate;
            n.rx           += data[i].rx_packets;
            n.tx           += data[i].tx_packets;
            
            if (data[i].port_no === controller_port) {
              n.controller = {"to": data[i].depart_rate, "from": data[i].arrival_rate,};
            }
          }
          
          /* Apply the model */
          model = new mm1();
          n.sojourn = model.sojourn(n.arrival_rate, n.depart_rate);
          n.length = model.length(n.arrival_rate, n.depart_rate);
          n.load = model.rho(n.arrival_rate, n.depart_rate);
          
          model_nodes[dpid] = n;
        }
        return model_nodes;
    }
    var update_gui: function(data) {
        elem.stats
            .selectAll(".dpid")
            .text(  function(d) {
                return "dpid:    "+dpid_to_int(d.dpid);                         });
        elem.stats
            .selectAll(".rx_packets")
            .text(  function(d) { 
                return "Rx:      "+data[d.dpid].rx.toFixed(2);          });
        elem.stats
            .selectAll(".lambda")
            .text(  function(d) { 
                return lambda_char+":   "+data[d.dpid].arrival_rate.toFixed(2); });
        elem.stats
            .selectAll(".controllerTx")
            .text(  function(d) { 
                return "to_ctrl: "+data[d.dpid].depart_rate.toFixed(2);         });
        elem.stats
            .selectAll(".sojourn")
            .text(  function(d) { 
                return "from_ctrl:   "+data[i].sojourn.toFixed(2);         });
    }
    event_update_statistics: function(new_stats) {
        console.log("Updating statistics");
        
        /* Apply the model */
        model_data = this.process_data(topo.nodes, new_stats);
        
        if (model_data === 0) 
          return "";
        
        /* Update the displayed data */
        update_gui(model_data);
        
        return "";
    },
}


function initialize_topology() {
    d3.json("/v1.0/topology/switches", function(error, switches) {
        d3.json("/v1.0/topology/links", function(error, links) {
            topo.initialize({switches: switches, links: links});
            elem.update();
        });
    });
}

function main() {
    initialize_topology();
}

main();
