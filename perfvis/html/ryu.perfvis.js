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
    {"flow_id": "e6c8d3da6b2315b0bc929bc63ce929aa", "packet_count": 0, "arrival_rate": 0.0, "total_packets": 100},
    {"flow_id": "bc929bc63ce929aae6c8d3da6b2315b0","packet_count": 0, "arrival_rate": 0.0, "total_packets": 100},
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
var LAM = String.fromCharCode(parseInt("03BB",16));
var MU = String.fromCharCode(parseInt("03BC",16));
var CTRL_PORT = 4294967294;
var NOT_READY = -1;
var INFINITE_BUFFER = -1;

/* For receiving performance information */
// current_stats = "";
// current_processed = "";
var ws = new WebSocket("ws://" + location.host + "/v1.0/performance/ws");
ws.onmessage = function(event) {
    // Process the data received
    var data = JSON.parse(event.data);
    
    console.log("Method:"+data.method);
    // console.log("Params:"+JSON.stringify(data.params[0]));

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
        .attr("x",30).attr("y",-20).text(function(d) {return "dpid:"+dpid_to_int(d.dpid);});
    statEnter.append("text").attr("class","rx")
        .attr("x",30).attr("y",-5).text("Rx:  (..)");
    statEnter.append("text").attr("class","total")
        .attr("x",90).attr("y",-5).text("Total:  (..)");
        
    statEnter.append("text").attr("class","lambda")
        .attr("x",30).attr("y",10).text(LAM+": (..)");
    statEnter.append("text").attr("class","mu")
        .attr("x",90).attr("y",10).text(MU+": (..)");
        
    // statEnter.append("text").attr("class","controllerTx")
        // .attr("x",30).attr("y",25).text("to_ctrl: (..)");
    // statEnter.append("text").attr("class","controllerRx")
        // .attr("x",30).attr("y",40).text("frm_ctrl: (..)");
        
        
    statEnter.append("text").attr("class","sojourn")
        .attr("x",30).attr("y",25).text("sojourn: (..)");
    statEnter.append("text").attr("class","load")
        .attr("x",30).attr("y",40).text("load: (..)");
    statEnter.append("text").attr("class","bufflen")
        .attr("x",30).attr("y",55).text("length: (..)");
        
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
    process_stats: function (nodes, stats) {
        var mn_length = 0;
        for (s in stats) { /* Create this.model_nodes */
          if (!this.model_nodes[s]) {
            this.model_nodes[s] = {};
          }
          mn_length++;
        }
        
        if (nodes.length != mn_length) {
          console.log("error, node and stat lengths differ");
          return NOT_READY;
        }
        
        /* 
         * TODO: add another node for the controller
         */
        
        /* Populate the node structure with the ports info?       >>>  LLINK */
        for (var i = 0; i < nodes.length; i++) { 
          var dpid = nodes[i].dpid;
          var n = {'dpid':dpid};  // for each node
          
          data = stats[dpid]; // data = {"flow_id":"e6c8d3da6b2315b0bc929bc63ce929aa","packet_count":0,"arrival_rate":0,"total_packets":100},
          
          console.log("Processing node "+dpid);
          if (data === "loading")
            return NOT_READY;
          
          /* input and output of the model */
          n.input = {};  // TODO: will be a list of flows, atm is an aggregate of all flows
          n.output = {};
          
          n.switchModel = 'openvswitch_vm' /* 'pica8' 'openWRT' 'facebook' etc */ // determined from controller?
          n.input.service_rate  = 56625;  // 17.66us
          n.input.arrival_rate = 0;
          n.input.rx           = 0;      // packets received over duration
          n.input.tot_rx       = 0;      // total packets received in this flow
          n.input.pnf          = 0;      // probability of using controller
          n.input.qstrategy    = 'mm1';  // type of model used for this node
          n.input.capacity     = INFINITE_BUFFER;   // capacity of the queue (buffer size)
          
          /* Compute this in the model itself..? 
           * **At the moment it's aggregating the flows for the switch** 
           */
          console.log("  Processing flows: ");
          for (var f = 0; f < data.length; f++) {
            console.log("    flow: "+data[f].flow_id);
            n.input.arrival_rate += data[f].arrival_rate;
            n.input.rx           += data[f].packet_count;
            n.input.tot_rx       += data[f].total_packets;
          }
          
          /* Apply the model */
          model = new mm1();
          n.output.load    =     model.rho (n.input.arrival_rate, n.input.service_rate);
          n.output.buflen  =  model.length (n.input.arrival_rate, n.input.service_rate);
          n.output.sojourn = model.sojourn (n.input.arrival_rate, n.input.service_rate);
          
          this.model_nodes[dpid] = n;
        }
        return this.model_nodes;
    },
    change_input: function(dp, attr, val) {
      this.mode_nodes[dp][attr] = val;
    },
    update_gui: function (data) {
        elem.stats.selectAll(".dpid").text(  function(d) {
                return "dpid:    "+dpid_to_int(d.dpid); });
        elem.stats.selectAll(".rx").text(  function(d) { 
                return "Rx:      "+data[d.dpid].input.rx; });
        elem.stats.selectAll(".total").text(  function(d) { 
                return "Total:   "+data[d.dpid].input.tot_rx; });
        elem.stats.selectAll(".lambda").text(  function(d) { 
                return LAM+":    "+data[d.dpid].input.arrival_rate.toFixed(2); });
        elem.stats.selectAll(".mu").text(  function(d) { 
                return MU+":     "+data[d.dpid].input.service_rate.toFixed(2); });
        elem.stats.selectAll(".sojourn").text(  function(d) { 
                return "sojourn: "+data[d.dpid].output.sojourn.toFixed(4); });
        elem.stats.selectAll(".load").text(  function(d) { 
                return "load:    "+data[d.dpid].output.load.toFixed(4); });
        elem.stats.selectAll(".bufflen").text(  function(d) { 
                return "length:  "+data[d.dpid].output.buflen.toFixed(4); });
    },
    event_update_statistics: function(new_stats) {
        console.log("Updating statistics");
        
        /* Apply the model */
        model_data = this.process_stats(topo.nodes, new_stats);
        
        if (model_data === NOT_READY) 
          return "";
        
        /* Update the displayed data */
        this.update_gui(model_data);
        
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
