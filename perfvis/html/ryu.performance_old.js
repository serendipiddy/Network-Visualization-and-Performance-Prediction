var OFPorts = {
    0xffffff00: 'OFPP_MAX',
    0xfffffff8: 'OFPP_IN_PORT',
    0xfffffff9: 'OFPP_TABLE',
    0xfffffffa: 'OFPP_NORMAL',
    0xfffffffb: 'OFPP_FLOOD',
    0xfffffffc: 'OFPP_ALL',
    0xfffffffd: 'OFPP_CONTROLLER',
    0xfffffffe: 'OFPP_LOCAL',
    0xffffffff: 'OFPP_ANY'
}

var NOT_READY = -1;

/* For receiving performance information */
var ws = new WebSocket("ws://" + location.host + "/v1.0/performance/ws");
ws.onmessage = function(event) {
    // Process the data received
    var data = JSON.parse(event.data);
    
    // create and send RPC reply
    var result = "";
    try {
      result = stats[data.method](data.params[0]);
    } catch(err) {console.log("ERROR"+err);}
    
    var ret = {"id": data.id, "jsonrpc": "2.0", "result": result};
    console.log("ws_performance returning: ",JSON.stringify(ret));
    this.send(JSON.stringify(ret));
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
              };
              menu_addDp(dpid);
            } 
            /* TODO: check this new way preserves the mode,switch and pnf etc if they're changed in Editmode */
            this.stats_nodes[dpid]
                .input =  {
                    'arrival_rate':     0,
                    'depart_rate':      0,
                    'service_rate':     config.switch_configs[config.switch_default].service_rate,  
                    'service_variance': config.switch_configs[config.switch_default].service_variance, 
                    'rx_packets':       0,          // packets received over duration
                    'tx_packets':       0,          // packets sent over duration
                    'total_rx':         0,          // total packets received on this port
                    'total_tx':         0,          // total packets sent on this port
                };
            this.stats_nodes[dpid].output = {};
            sn_length++;
        }
        
        if (nodes.length != sn_length) {
            console.log("error, node and stat lengths differ");
            return NOT_READY;
        }
        
        /* TODO: add another node for the controller */
        
        /* Populate the node structure with the flow info */
        for (var i = 0; i < nodes.length; i++) { 
            var dpid = nodes[i].dpid;
            data = stats[dpid]; 
            
            if (data === "loading")
              return NOT_READY;
            
            this.stats_nodes[dpid].input.ports = {};
            for (var f = 0; f < data.length; f++) {
                var port = data[f];
                var port_no = data[f].port_no;
                delete port.port_no;
                
                if (!(port_no in OFPorts)) {
                  this.stats_nodes[dpid].input.depart_rate  += port['arrival_rate'];
                  this.stats_nodes[dpid].input.arrival_rate += port['depart_rate'];
                  this.stats_nodes[dpid].input.rx_packets   += port['rx_packets'];
                  this.stats_nodes[dpid].input.tx_packets   += port['tx_packets'];
                  this.stats_nodes[dpid].input.total_rx     += port['total_rx'];
                  this.stats_nodes[dpid].input.total_tx     += port['total_tx'];
                } 
                
                this.stats_nodes[dpid].input.ports[port_no] = port;
            }
            
        }
    },
    event_update_statistics: function(new_stats) {
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
    inputchange: {}, /* Changes that sit on top of the live data */
    persistentchange: {}, /* CHanges that replace the live data */
    start_edit: function () { /* Stops live readings */
      console.log('entering edit mode');
      this.editmode = true;
      this.graph = JSON.parse(JSON.stringify(topo))
    },
    end_edit: function () { /* Resumes live readings */
      console.log('leaving edit mode');
      /* this.data = stats.stats_nodes // should I? */
      this.editmode = false;
      this.graph = "";
    },
    update_data: function (data) { /* Replace this.data with live readings */
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
          update_gui(this.data);
        }
    },
    change_switch_model: function(dpid, new_model) { /* Change the model used by given switch */
        if (!(this.data[dpid])) {
          console.log("unknown dpid: "+dpid);
          return;
        }
        if (config.queueing_models[new_model]) {
            this.data[dpid]['model'] = new_model;
            console.log('changed '+dpid+' to use \''+new_model+'\' model');
            this.set_input(dpid, 'queue_capacity', new_model);
            
            this.run_model(dpid);
            update_gui(this.data);
        }
        else console.log('queueing model \''+new_model+'\' not found');
    },
    change_switch_name: function(dpid, new_name) { /* Change the switch hardware used by given switch */
        if (!(this.data[dpid])) {
          console.log("unknown dpid: "+dpid);
          return;
        }
        if (config.switch_configs[new_name]) {
            new_config = config.switch_configs[new_name];
            console.log(new_name+" "+this.data[dpid]+" "+dpid);
            this.data[dpid]['switch_name']      = new_name;
            this.data[dpid].input['service_rate']     = new_config.service_rate;
            this.data[dpid].input['service_variance'] = new_config.service_variance;
            
            this.run_model(dpid);
            update_gui(this.data);
            console.log("changed "+dpid+" to "+new_name);
        }
        else console.log('switch config \''+new_name+'\' not found');
    },
    change_input_by: function(dpid, attr, value) { /* Add this to the live readings */
        if (!(this.data[dpid])) {
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
    set_input: function(dpid, attr, value) { /* Set an attribute to remain during updates, persists */
        if (!(this.data[dpid])) {
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
    edit_switch_input: function(dpid, attr, value) { /* Replaces the live readings, during edit mode */
        if (!(this.data[dpid])) {
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
    run_model: function(dpid) { /* Applies to switches, getting their performance information */
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
        if (!(this.data[dpid])) {
          console.log("unknown dpid: "+dpid);
          return;
        }
        
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
        // console.log(model_name);
        var out = output(model_name,input);
        
        this.data[dpid].output.load    = out.load;
        this.data[dpid].output.buflen  = out.length;
        this.data[dpid].output.sojourn = out.sojourn;
    },
    add_switch: function(to_clone) { /* Artificially adds a switch to the network */
        /* 
            need some dpid allocation system
            deep copy of the given node (or define some blank one?)
            then need to edit the topology
        */
    },
    
};

var update_gui = function (data) { /* Updates the displayed performance values */
    // console.log('Updating GUI')
    elem.stats.selectAll(".dpid").text(  function(d) {
            return "dpid:    "+dpid_to_int(d.dpid); });
    elem.stats.selectAll(".rx").text(  function(d) { 
            return "Rx:      "+data[d.dpid].input.rx_packets; });
    elem.stats.selectAll(".total").text(  function(d) { 
            return "Total:   "+data[d.dpid].input.total_rx; });
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
      
}

var test_edit_part1 = function(val) {
  editmode.start_edit();
  editmode.edit_switch_input(editmode.datapaths[0],'arrival_rate',val);
  update_gui(editmode.data);
}
var test_edit_part2 = function() {
  editmode.run_model(editmode.datapaths[0]);
  update_gui(editmode.data);
}

var display_graph = {
  /* for each input/output display a graph grouping like-puts */
}

/* Samples for testing offline */
var sample = {
  "0000000000000001": [
    {"port_no": "1", "rx_packets": 0, "tx_packets": 0, "arrival_rate": 100.0, "depart_rate": 100.0, "total_rx": 100, "total_rx": 100},
    {"port_no": "2", "rx_packets": 0, "tx_packets": 0, "arrival_rate": 100.0, "depart_rate": 100.0, "total_rx": 100, "total_rx": 100},
  ],
  "0000000000000002": [
    {"port_no": "1", "rx_packets": 0, "tx_packets": 0, "arrival_rate": 100.0, "depart_rate": 100.0, "total_rx": 100, "total_rx": 100},
    {"port_no": "2", "rx_packets": 0, "tx_packets": 0, "arrival_rate": 100.0, "depart_rate": 100.0, "total_rx": 100, "total_rx": 100},
  ]
};
var sample_switches = [
  { "dpid": "0000000000000001",
    "ports": [
      {"hw_addr": "62:97:f2:85:7b:af", "name": "s1-eth1", "port_no": "00000001", "dpid": "0000000000000001"}, 
      {"hw_addr": "02:5d:c1:3d:2f:8e", "name": "s1-eth2", "port_no": "00000002", "dpid": "0000000000000001"}
    ]}, 
  { "dpid": "0000000000000002",
    "ports": [
      {"hw_addr": "82:bd:da:72:ca:bb", "name": "s2-eth1", "port_no": "00000001", "dpid": "0000000000000002"}, 
      {"hw_addr": "de:14:29:11:01:61", "name": "s2-eth2", "port_no": "00000002", "dpid": "0000000000000002"}
    ]}
];
var sample_links = [
  { "src": {"hw_addr": "de:14:29:11:01:61", "name": "s2-eth2", "port_no": "00000002", "dpid": "0000000000000002"}, 
    "dst": {"hw_addr": "02:5d:c1:3d:2f:8e", "name": "s1-eth2", "port_no": "00000002", "dpid": "0000000000000001"}
  }, 
  { "src": {"hw_addr": "02:5d:c1:3d:2f:8e", "name": "s1-eth2", "port_no": "00000002", "dpid": "0000000000000001"}, 
    "dst": {"hw_addr": "de:14:29:11:01:61", "name": "s2-eth2", "port_no": "00000002", "dpid": "0000000000000002"}
  }
];

function init_local() {
    topo.initialize({switches: sample_switches, links: sample_links});
    elem.update();
    stats.event_update_statistics(sample);
}

// init_local(); // for offline testing
main();    // for server