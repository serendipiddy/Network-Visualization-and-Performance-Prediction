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
// var READY = 0;

/* For receiving performance information */
var ws = new WebSocket("ws://" + location.host + "/v1.0/performance/ws");
ws.onmessage = function(event) {
    // Process the data received
    var new_data = JSON.parse(event.data);
    // console.log(JSON.stringify(new_data),null,2);
    
    // create and send RPC reply
    var result = "";
    // try { // TODO: uncomment this in final versions
      result = pf_data[new_data.method](topo.nodes,new_data.params[0]);
      if (result == NOT_READY) {
        console.log('not ready');
        $('#control-panel').hide();
        $('#loading').show();
      }
      else {
        console.log('successful update');
        /* enable control panel */
        $('#loading').hide();
        $('#control-panel').show();
        update_gui();
      }
      result = "";
    // } catch(err) {console.log("ERROR"+err);}
    
    var ret = {"id": new_data.id, "jsonrpc": "2.0", "result": result};
    console.log("ws_performance returning: ",JSON.stringify(ret));
    this.send(JSON.stringify(ret));
}

var dpid_exists = function(dpid) {
  if (!(pf_data.node_data.hasOwnProperty(dpid))) {
    console.log("unknown dpid: "+dpid);
    return false;
  }
  return true;
}

var pf_data = {
    node_data: {}, 
    live_data: {},
    controller: {'placeholder':true},
    new_node: function(dpid,pnf,queue_capacity,is_real_node) { /* Creates node and adds it to this.nodes */
      var node = {
        'dpid': dpid,
        'switch_brand':   config.switch_default,   /* default now, set through UI */ 
        'queueing_model': config.model_default, /* default now, set through UI */ 
        'node_status': (is_real_node ? 'active':'additional'),    /* default setting */
        // 'configuration': {
        'service_rate': config.switch_configs[config.switch_default].service_rate, 
        'pnf':            pnf,
        'queue_capacity': queue_capacity,
        'adjustments': { /* set through UI */ 
          'service_rate':   0,
          'arrival_rate':   0,
          'pnf':            0, 
          'queue_capacity': 0,
          'ports':          [] /* used in edit mode to add/remove ports */
        }
        // }
      }
      var live = {
        'dpid': dpid,
        'ports': [],            /* populated next */
        'aggregate': {          /* populated next */
          'arrival_rate': 0,    
          'departure_rate': 0
        },
        'proportion_in':  [],
        'proportion_out': [],
        'adjacent_nodes': []      /* populate next */
      };
      return {
        'node': node,
        'live': live,
      }
    },
    remove_node: function(dpid) {
      if(dpid_exists(dpid)) {
        delete this.node_data[dpid];
        delete this.live_data[dpid];
        console.log('dpid \''+dpid+'\' removed');
        return;
      }
    },
    event_update_statistics: function (toponodes, update) {
        var sn_length = 0;
        
        if ($.isEmptyObject(update)) {
          console.log('Controller still loading');
          return NOT_READY;
        }
        
        /* Create this.stats_nodes */
        for (dpid in update) { 
            /* Doesn't exist, make it */
            if (!this.node_data[dpid]) {
              var new_node = this.new_node(dpid,0,0,true);
              this.node_data[dpid] = new_node.node;
              this.live_data[dpid] = new_node.live;
              menu_addDp(dpid);
            } 
            
            /* If it shouldn't exist, hide it 
               (Removing old nodes without removing configuration or deleting from edit mode)
            */
            var should_exist = false;
            if (this.node_data[dpid].node_status === 'active') { // if it is supposed to exist
              for (var i = 0; i<toponodes.length; i++) {
                if (toponodes[i].dpid == dpid)
                  should_exist = true;
              }
              if(!should_exist) { // but doesn't exist, it shouldn't, so hide
                console.log("dpid "+dpid+" does not exist in topology");
                this.node_data[dpid].node_status = 'inactive';
              }
            }
        }
        // console.log("====== Current Nodes ======");
        // console.log(JSON.stringify(this.node_data,null,2));
        // console.log(JSON.stringify(this.live_data,null,2));
            
        for (var j = 0; j<toponodes.length; j++) { // get dp from toponodes (for consistency?)
            var dpid = toponodes[j].dpid;
            var node = this.node_data[dpid];
            var live = this.live_data[dpid];
            var update_dp = update[dpid];
            
            if (update_dp === "loading") {
              console.log('Controller still loading');
              return NOT_READY;
            }
            
            // console.log('checking ports are same')
            /* check ports are the same */
            // console.log('A:'+live.ports);
            for (var i = 0; i<update_dp.length; i++) {
              if ($.inArray(update_dp[i].port_no,live.ports)<0) { // is in update but not local
                console.log('adding \'live but not local\' ports');
                live.ports.push(update_dp[i].port_no);
                this.live_data.adjacent_nodes = topo.get_links(dpid);
              }
            }
            if (live.ports.length != update_dp.length) {
              var new_ports = [];
              for (var i = 0; i<live.ports.length; i++) {
                if ($.inArray(live.ports[i],update_dp>=0)) { // is local but not in update
                  console.log('in local, and in update, so save it');
                  new_ports.push(live.ports[i]);           // save ports in both
                }
                else {
                  console.log('removing from live ports'); // removed by replacing live.ports with new_ports below
                  /* remove from adjacent nodes */
                  for (var n = 0; n<this.live_data.adjacent_nodes; n++) {
                    if (this.live_data.adjacent_nodes[n].port_no == live.ports[i])
                    delete this.live_data.adjacent_nodes[n];
                  }
                  /* TODO remove from adjustments, when defined form of port adjustment */
                }
              }
              this.live_data.ports = new_ports;
            }
            
            // console.log('updating live data')
            /* Update node's live data:
             *  - total arrival/departure rate 
             *  - proportions in/out 
             */
            var total_out = 0;
            var total_in  = 0;
            var rate_in   = [];
            var rate_out  = [];
            
            for (var i = 0; i<update_dp.length; i++) {
              var port = update_dp[i];
              
              // ignore the LOCAL/special/controller ports
              if (!(port.port_no in OFPorts)) {
                total_in += port.arrival_rate;
                total_out += port.depart_rate;
                rate_in.push({'port_no':port.port_no,'proportion':port.arrival_rate});
                rate_out.push({'port_no':port.port_no,'proportion':port.depart_rate});
              }
            }
            live.aggregate.arrival_rate = total_in;
            live.aggregate.depart_rate = total_out;
            live.proportion_in = [];
            live.proportion_out = [];
            
            for (var i = 0; i<rate_in.length; i++) {
              live.proportion_in.push({'port_no':rate_in[i].port_no,'proportion':rate_in[i].proportion/total_in});
              live.proportion_out.push({'port_no':rate_out[i].port_no,'proportion':rate_out[i].proportion/total_out});
            }
            sn_length++;
            // console.log('finished updating '+dpid);
        }
        
        if (toponodes.length != sn_length) {
            console.log("Error: topo ("+toponodes.length+") and update node ("+sn_length+") lengths differ");
            return NOT_READY;
        }
        
        /* TODO: add another object for the controller */
    },
    set_adjustment: function(dpid, attr, value) {
      if (!dpid_exists) {
        return;
      }
      if ($.inArray(attr,config.adjustment_keys)<0) {
        console.log(attr+" is not a valid adjustment key");
        return;
      }
      /* TODO: make sure change does not exceed some bounds (ie if - is less than live value, or do that elsewhere? */
      if (!isNaN(value)) this.node_data[dpid].adjustments[attr] = parseFloat(value);
      else console.log(value+" is not a number");
    },
    set_config: function(dpid, attr, value) {
      if (!dpid_exists) return;
      if ($.inArray(attr,config.config_keys)<0) {
        console.log(attr+" is not a valid config key");
        return;
      }
      
      if (attr === 'switch_brand') {
        if (config.switch_configs[value]) {
          this.node_data[dpid]['switch_brand'] = value;
          this.node_data[dpid]['service_rate'] = config.switch_configs[value].service_rate;
          console.log('Changed '+dpid+' to use \''+value+'\' brand');
        } else console.log('not a valid brand');
      }
      else if (attr === 'queueing_model') {
        if (config.queueing_models[value]) {
          this.node_data[dpid]['queueing_model'] = value;
          console.log('Changed '+dpid+' to use \''+value+'\' model');
        } else console.log('not a valid queuing model');
      }
      else {
        if (!isNaN(value)) this.node_data[dpid][attr] = parseFloat(value);
        else console.log(value+" is not a number");
      }
    },
    get_model_input_dpid: function(dpid) {
      if (dpid_exists) {
        var ret = {
          'service_rate': this.node_data[dpid].service_rate + this.node_data[dpid].adjustments.service_rate,
          'arrival_rate': this.live_data[dpid].aggregate.arrival_rate + this.node_data[dpid].adjustments.arrival_rate,
          'queue_capacity': this.node_data[dpid].queue_capacity + this.node_data[dpid].adjustments.queue_capacity
        }
        /* make sure alterations didn't push below 0 */
        for(a in ret) {
          if (ret[a] < 0) ret[a] = 0;}
        return ret;
      }
      return {};
    },
    get_gui_input_all: function() {
      var all_data = {};
      for(dpid in this.node_data) {
        if (dpid_exists) {
          var ret = {
            'service_rate': {'live':this.node_data[dpid].service_rate,'adjustment':this.node_data[dpid].adjustments.service_rate},
            'arrival_rate': {'live':this.live_data[dpid].aggregate.arrival_rate, 'adjustment':this.node_data[dpid].adjustments.arrival_rate},
            'queue_capacity': {'live':this.node_data[dpid].queue_capacity, 'adjustment': this.node_data[dpid].adjustments.queue_capacity}
          }
          /* make sure alterations don't go below 0 */
          for(a in ret) {
            if ((ret[a].live + ret[a].adjustment) < 0) ret[a].adjustment = 0-ret[a].live;}
          all_data[dpid] = ret;
        }
      }
      return all_data;
    },
    get_model_input_all: function() {
      var all_data = {};
      for(dpid in this.node_data) {
        all_data[dpid] = this.get_model_input_dpid(dpid);
      }
      return all_data;
    },
}

var model = {
    calculate_chains: function() {
      
    },
    get_output_dpid: function(dpid,input) {
      var model = pf_data.node_data[dpid].queueing_model;
      if (config.queueing_models[model]) {
          // console.log('Running '+model+' model on \''+dpid+'\' brand');
          return this.compute(model,pf_data.get_model_input_dpid(dpid));
        } else console.log('not a valid brand');
    },
    get_output_all: function() {
      var all_data = {};
      for (dpid in pf_data.node_data) {
        all_data[dpid] = this.get_output_dpid(dpid);
      }
      return all_data;
    },
    compute: function(model_name, input) {
      var model_config = config.queueing_models[model_name];
      var model = config.get_model[model_name];
      
      var model_in = {};
      /* Check input data */
      for (var i = 0; i < model_config.model_in.length; i++) {
          val = model_config.model_in[i];
          if (!input.hasOwnProperty(val)) {
            console.log('Model required input \''+val+'\' not found');
            return;
          }
          /* check that each val is valid */
          model_in[val] = input[val];
      }
      
      model.set_input(model_in);
      
      var results = {};
      /* Construct results from configuration */
      for (var i = 0; i < model_config.model_out.length; i++) {
          fn = model_config.model_out[i];
          results[fn] = model[fn]();
      }
      
      return results;
    }
}

var Node = function(dpid, ports, proportions) {
  this.dpid = dpid;
  this.ports = []; // pointers to the adjacent nodes
  this.proportion_out = []; // proportion of each node in ports
  this.localIndex = 'local';
}
var spanningtree = {
  root: '',
  members: [], 
  create: function(src) { // creates a new root node, then populates
    this.root = new Node(dpid,[],[]);
    // BFS, no backsies, stop when no ports
    ports = pf_data.live_data(root.dpid).adjacent_nodes;
  },
  populate_tree: function() {
  
  },
  contains: function(dpid) {
    if ($.inArray(dpid,members)>=0) {
      return true;
    }
    return false;
  },
}

/* Graphing currently connects to the GUI vis file */
var graphing = {
  graphs: [],
  pf_labels: [],
  model_labels: [],
  create_graphs: function(pf_labels,model_labels){
    this.graphs = [];
    this.pf_labels = [];
    this.model_labels = [];
    for (var l = 0; l<pf_labels.length; l++) {
      this.graphs.push(get_graph(pf_labels[l]));
      this.pf_labels.push(pf_labels[l]);
    }
    for (var l = 0; l<model_labels.length; l++) {
      this.graphs.push(get_graph(model_labels[l]));
      this.model_labels.push(model_labels[l]);
    }
  },
  get_graph_data: function (pf_out, model_data) {
    /* for each input/output display a graph grouping like-puts */
    
    /* parameter structure
    // var pf_labels = ['service_rate', 'arrival_rate', 'queue_capacity'];
    // var model_labels = ['load','sojourn'];
    
    console.log(JSON.stringify(pf_out));
    console.log(JSON.stringify(model_data));
    {
      "0000000000000001":{"service_rate":56625,"arrival_rate":13041,"queue_capacity":0},
      "0000000000000002":{"service_rate":56625,"arrival_rate":15577,"queue_capacity":0}
    }
    {
      "0000000000000001":{"load":0.2303046357615894,"length":0.29921530837004406,"sojourn":0.000022944199706314243},
      "0000000000000002":{"load":0.2750905077262693,"length":0.37948255700643146,"sojourn":0.000024361722861040732}
    }
    */
    
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
    
    for (dpid in pf_out) {
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
    
    return zipGraphData(graph_data);
  },
  update_graphs: function (pf_out, model_data) {
    var data = this.get_graph_data(pf_out, model_data);
    for(var i = 0; i<this.graphs.length; i++) {
      update_graph(this.graphs[i],data[i].data);
    }
  },
}

/* Select the data to graph */
graphing.create_graphs(['service_rate', 'arrival_rate', 'queue_capacity'],['load','sojourn']);
// graphing.create_graphs(['arrival_rate'],[]);

var update_gui = function () { /* Updates the displayed performance values */
    var in_data  = pf_data.get_gui_input_all();
    var model_data = model.get_output_all();
    
    update_gui_text(in_data,model_data);
    graphing.update_graphs(in_data,model_data);
}

/* Samples for testing offline */
var sample = {
  data: {
    "0000000000000001": [
      {"port_no": "1", "rx_packets": 0, "tx_packets": 0, "arrival_rate": 100.1, "depart_rate": 101.1, "total_rx": 100, "total_rx": 100},
      {"port_no": "2", "rx_packets": 0, "tx_packets": 0, "arrival_rate": 100.2, "depart_rate": 101.2, "total_rx": 100, "total_rx": 100},
    ],
    "0000000000000002": [
      {"port_no": "1", "rx_packets": 0, "tx_packets": 0, "arrival_rate": 200.1, "depart_rate": 201.1, "total_rx": 100, "total_rx": 100},
      {"port_no": "2", "rx_packets": 0, "tx_packets": 0, "arrival_rate": 200.2, "depart_rate": 201.2, "total_rx": 100, "total_rx": 100},
    ]
  },
  switches: [
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
  ],
  links: [
    { "src": {"hw_addr": "de:14:29:11:01:61", "name": "s2-eth2", "port_no": "00000002", "dpid": "0000000000000002"}, 
      "dst": {"hw_addr": "02:5d:c1:3d:2f:8e", "name": "s1-eth2", "port_no": "00000002", "dpid": "0000000000000001"}
    }, 
    { "src": {"hw_addr": "02:5d:c1:3d:2f:8e", "name": "s1-eth2", "port_no": "00000002", "dpid": "0000000000000001"}, 
      "dst": {"hw_addr": "de:14:29:11:01:61", "name": "s2-eth2", "port_no": "00000002", "dpid": "0000000000000002"}
    }
  ]
};

function init_local() {
    topo.initialize({switches: sample.switches, links: sample.links});
    elem.update();
    pf_data.event_update_statistics(topo.nodes,sample.data);
    $('#loading').hide();
    $('#control-panel').show();
    update_gui();
    
    var random_sample_data = function() {
      for (dpid in sample.data) {
        for (var i = 0; i< sample.data[dpid].length; i++) {
          sample.data[dpid][i].arrival_rate = Math.round(Math.random() * 9500) + 500;
        }
      }
    };
      
    setInterval(function(s) {
      random_sample_data();
      pf_data.event_update_statistics(topo.nodes,sample.data);
      console.log('successful update');
      $('#loading').hide();
      $('#control-panel').show();
      update_gui();
      
    }, 2000);
}


init_local(); // for offline testing
// main();    // for server