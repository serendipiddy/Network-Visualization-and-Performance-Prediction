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
    {"flow_id": "e6c8d3da6b2315b0bc929bc63ce929aa", "packet_count": 0, "arrival_rate": 100.0, "total_packets": 100},
    {"flow_id": "bc929bc63ce929aae6c8d3da6b2315b0","packet_count": 0, "arrival_rate": 100.0, "total_packets": 100},
  ],
  "0000000000000002": [
    {"flow_id": "e6c8d3da6b2315b0bc929bc63ce929aa", "packet_count": 0, "arrival_rate": 100.0, "total_packets": 100},
    {"flow_id": "bc929bc63ce929aae6c8d3da6b2315b0","packet_count": 0, "arrival_rate": 100.0, "total_packets": 100},
  ]
};
var sample_switches = [{"ports": [{"hw_addr": "62:97:f2:85:7b:af", "name": "s1-eth1", "port_no": "00000001", "dpid": "0000000000000001"}, {"hw_addr": "02:5d:c1:3d:2f:8e", "name": "s1-eth2", "port_no": "00000002", "dpid": "0000000000000001"}], "dpid": "0000000000000001"}, {"ports": [{"hw_addr": "82:bd:da:72:ca:bb", "name": "s2-eth1", "port_no": "00000001", "dpid": "0000000000000002"}, {"hw_addr": "de:14:29:11:01:61", "name": "s2-eth2", "port_no": "00000002", "dpid": "0000000000000002"}], "dpid": "0000000000000002"}];
var sample_links = [{"src": {"hw_addr": "de:14:29:11:01:61", "name": "s2-eth2", "port_no": "00000002", "dpid": "0000000000000002"}, "dst": {"hw_addr": "02:5d:c1:3d:2f:8e", "name": "s1-eth2", "port_no": "00000002", "dpid": "0000000000000001"}}, {"src": {"hw_addr": "02:5d:c1:3d:2f:8e", "name": "s1-eth2", "port_no": "00000002", "dpid": "0000000000000001"}, "dst": {"hw_addr": "de:14:29:11:01:61", "name": "s2-eth2", "port_no": "00000002", "dpid": "0000000000000002"}}];

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
      result = stats[data.method](data.params[0]);
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
        
    statEnter.append("text").attr("class","lambda")
        .attr("x",30).attr("y",-5).text(LAM+": (..)");
    statEnter.append("text").attr("class","mu")
        .attr("x",90).attr("y",-5).text(MU+": (..)");
        
    statEnter.append("text").attr("class","rx")
        .attr("x",30).attr("y",10).text("Rx:  (..)");
    statEnter.append("text").attr("class","total")
        .attr("x",90).attr("y",10).text("Total:  (..)");
        
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

var stats = {
    stats_nodes: {}, 
    process_stats: function (nodes, stats) {
        var sn_length = 0;
        
        /* Create this.stats_nodes */
        for (dpid in stats) { // 'in' uses the keys from stats => the dpid
            if (!this.stats_nodes[dpid]) {
              this.stats_nodes[dpid] = {
                'dpid':             dpid,
                'switch_name':      config.switch_default, /* 'pica8' 'openWRT' 'facebook' etc */ // determined from controller?
                'model':            config.model_default, // type of model used for this node
                'pnf':              0,                    // probability of using controller
                'queue_capacity':   NOT_READY,            // capacity of the queue (buffer size)
                
                /* input and blank output of the model */
                'input':  {  // TODO: will be a list of flows, atm is an aggregate of all flows
                    'arrival_rate':     0,
                    'service_rate':     config.switch_configs[config.switch_default].service_rate,  
                    'service_variance': config.switch_configs[config.switch_default].service_variance, 
                    'rx':               0,          // packets received over duration
                    'tot_rx':           0,          // total packets received in this flow
                },  
                'output': {},
              };
            }
            sn_length++;
        }
        
        if (nodes.length != sn_length) {
          console.log("error, node and stat lengths differ");
          return NOT_READY;
        }
        
        /* 
         * TODO: add another node for the controller
         */
        
        /* Populate the node structure with the flow info */
        for (var i = 0; i < nodes.length; i++) { 
          var dpid = nodes[i].dpid;
          
          // data = {"flow_id":,"packet_count":,"arrival_rate":,"total_packets":},
          data = stats[dpid]; 
          
          console.log("Processing node "+dpid);
          if (data === "loading")
            return NOT_READY;
          
          /* Compute this in the model itself..? 
           * **At the moment it's aggregating the flows for the switch** 
           */
          console.log("  Processing flows: ");
          for (var f = 0; f < data.length; f++) {
            this.stats_nodes[dpid].input.arrival_rate = 0;
            this.stats_nodes[dpid].input.rx           = 0;
            this.stats_nodes[dpid].input.tot_rx       = 0;
          }
          
          for (var f = 0; f < data.length; f++) {
            console.log("    flow: "+data[f].flow_id);
            this.stats_nodes[dpid].input.arrival_rate += data[f].arrival_rate;
            this.stats_nodes[dpid].input.rx           += data[f].packet_count;
            this.stats_nodes[dpid].input.tot_rx       += data[f].total_packets;
          }
        }
        return this.stats_nodes;
    },
    event_update_statistics: function(new_stats) {
        console.log("Updating statistics");
        
        /* Update stats */
        this.process_stats(topo.nodes, new_stats);
        
        if (this.stats_nodes === NOT_READY) 
          return "";
          
        editmode.update_data(this.stats_nodes);
        return "";
    },
}

var editmode = {
    data: {},
    datapaths: [],
    saved_data: {}, // 'key' -> data
    editmode: false,
    inputchange: {},
    persistentchange: {},
    start_edit: function () {
      console.log('entering edit mode');
      this.editmode = true;
    },
    end_edit: function () {
      console.log('leaving edit mode');
      /* this.data = stats.stats_nodes // should I? */
      this.editmode = false;
    },
    update_data: function (data) {
        if (!this.editmode) {
          /* Apply the model */
          this.data = JSON.parse(JSON.stringify(data));
          for (dp in data) {
            this.datapaths.push(dp);
            
            /* see if this dp has any dynamic changes */
            if (dp in this.inputchange) {
                for (change in this.inputchange[dp]) {
                    this.edit_switch_input(dp, change, this.inputchange[dp][change] + data[dp].input[change]);
                }
            }
            if (dp in this.persistentchange) {
                for (change in this.persistentchange[dp]) {
                    this.edit_switch_input(dp, change, this.persistentchange[dp][change]);
                }
            }
            this.run_model(dp);
          }
          
          /* Update the displayed data */
          this.update_gui(this.data);
        }
    },
    change_switch_model: function(dpid, new_model) {
        if (config.queueing_models[new_model]) {
            this.data[dpid]['model'] = new_model;
            console.log('changed '+dpid+' to use \''+new_model+'\' model');
            this.set_editmode_change(dpid, 'queue_capacity', new_model);
        }
        else console.log('queueing model \''+new_model+'\' not found');
    },
    change_switch_name: function(dpid, new_name) {
        if (config.switch_configs[new_name]) {
            new_config = config.switch_configs[new_name];
            this.data[dpid]['switch_name']      = new_name;
            this.data[dpid].input['service_rate']     = new_config.service_rate;
            this.data[dpid].input['service_variance'] = new_config.service_variance;
            
            this.run_model(dpid);
            this.update_gui(this.data);
            console.log("changed "+dpid+" to "+new_name);
        }
        else console.log('switch config \''+new_name+'\' not found');
    },
    change_input_by: function(dpid, attr, value) { /* Add this to the live readings */
        if (!dpid in this.datapaths) {
          console.log("unknown dpid: "+dpid);
          return;
        }
        
        /* TODO: make sure attr and value are valid (copy from edit_switch_input) */
        var currentchanges = {};
        if (dpid in this.inputchange) {
          currentchanges = this.inputchange[dpid];
        }
        console.log("newchanges:     "+attr+", "+value);
        currentchanges[attr] = value;
        this.inputchange[dpid] = currentchanges;
        /* this makes change instant, but allows incorrect cumulative increases */
        // this.edit_switch_input(dp, attr, value + this.data[dp].input[attr]); 
    },
    set_input: function(dpid, attr, value) {
        if (!dpid in this.datapaths) {
          console.log("unknown dpid: "+dpid);
          return;
        }
        
        var currentchanges = {};
        if (dpid in this.persistentchange) {
          currentchanges = this.persistentchange[dpid];
        }
        console.log("newchanges:     "+attr+", "+value);
        currentchanges[attr] = value;
        this.persistentchange[dpid] = currentchanges;
    },
    edit_switch_input: function(dpid, attr, value) { /* Replaces the live readings */
        if (!this.data[dpid]) {
          console.log('unknown dpid: '+dpid);
          return;
        }
        if (this.data[dpid].input[attr]) {
          this.data[dpid].input[attr] = value;
        }
        else if (this.data[dpid][attr]) {
          this.data[dpid][attr] = value;
        }
        else {
          console.log('unknown attr: '+attr);
          return;
        }
        console.log('changed '+dpid+'\'s '+attr+' to '+value);
    },
    run_model: function(dpid) {
        /* 
          get model from this.data[dpid].qstrategy
          model = this.data[dpid].qstrategy;
          using the values from config:
              for (fn_name in config[model]['outout']) {
                this.data[dpid].output[fn_name] = model.[fn_name] ....
              }
              
          or maybe read the input values into {for i in input -> arrival_rate, service_rate} pass that object to the model
            then read back an output object, set data.output = that_output..?
        */
        
        var model_name = this.data[dpid].model;
        var input = {
            'arrival_rate':     this.data[dpid].input.arrival_rate,
            'service_rate':     this.data[dpid].input.service_rate,
            'service_variance': this.data[dpid].input.service_variance,
            'rx':               this.data[dpid].input.rx,
            'tot_rx':           this.data[dpid].input.tot_rx,
            'pnf':              this.data[dpid].pnf,
            'queue_capacity':   this.data[dpid].queue_capacity,
        }
        console.log(model_name);
        var out = output(model_name,input);
        
        this.data[dpid].output.load    = out.load;
        this.data[dpid].output.buflen  = out.length;
        this.data[dpid].output.sojourn = out.sojourn;
    },
    add_switch: function(to_clone) {
        /* 
            need some dpid allocation system
            deep copy of the given node (or define some blank one?)
            then need to edit the topology
        */
    },
    update_gui: function (data) {
        console.log('Updating GUI')
        // console.log(data)
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
        // if(Object.getOwnPropertyNames(ratechange).length > 0))
          
    },
};

function initialize_topology() {
    d3.json("/v1.0/topology/switches", function(error, switches) {
        d3.json("/v1.0/topology/links", function(error, links) {
            topo.initialize({switches: switches, links: links});
            elem.update();
        });
    });
}

function init_local() {
    topo.initialize({switches: sample_switches, links: sample_links});
    elem.update();
    stats.event_update_statistics(sample);
}

var test_edit_part1 = function(val) {
  editmode.start_edit();
  editmode.edit_switch_input(editmode.datapaths[0],'arrival_rate',val);
  editmode.update_gui(editmode.data);
}
var test_edit_part2 = function() {
  editmode.run_model(editmode.datapaths[0]);
  editmode.update_gui(editmode.data);
}

function main() {
    // initialize_topology();
    init_local();
}

main();
