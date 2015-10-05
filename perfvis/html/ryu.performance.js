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
    var new_data = JSON.parse(event.data);
    // console.log(JSON.stringify(new_data),null,2);
    
    if (edit_mode.active) {
      var ret = {"id": new_data.id, "jsonrpc": "2.0", "result": ""};
      this.send(JSON.stringify(ret));
      return;
    }
    
    // create and send RPC reply
    var result = "";
    // try { // TODO: uncomment this in final versions
      result = pf_data[new_data.method](topo.nodes,new_data.params[0]);
      if (result == NOT_READY) {
        console.log('not ready');
        $('#control-panel').hide();
        $('#loading').show();
      }
      else if (new_data.method === 'event_update_controller') {
        // null
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
    // console.log("ws_performance returning: ",JSON.stringify(ret));
    this.send(JSON.stringify(ret));
}

var dpid_exists = function(dpid) { /* TODO: move this to inside pf_data.. unless it really it a vital function.. */
  if (!(pf_data.node_data.hasOwnProperty(dpid))) {
    console.log("unknown dpid: "+dpid);
    return false;
  }
  return true;
}

var pf_data = {
    node_data: {}, 
    live_data: {},
    exponSmoothing: false,
    alpha: 0.5, // for exponential smoothing
    controller: {
      'data':'',
      'live':''
    },
    setExponSmoothing: function(on,alpha) {
      if (on) {
          this.exponSmoothing = true;
          if (alpha < 1 && alpha > 0) this.alpha = alpha; // otherwise leave it alone
      }
      else this.exponSmoothing = false;
    },
    new_node: function(dpid,pnf,queue_capacity,is_real_node) { /* Creates node and adds it to this.nodes */
      var node = {
        'dpid': dpid,
        'switch_brand':   config.switch_default,   /* default now, set through UI */ 
        'queueing_model': config.model_default, /* default now, set through UI */ 
        'node_status': (is_real_node ? 'active':'extra'),    /* default setting */
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
        for (var dpid in update) { 
            /* Doesn't exist, make it */
            if (!this.node_data[dpid]) {
              var new_node = this.new_node(dpid,0,100,true);
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
            
            /* check ports are the same */
            for (var i = 0; i<update_dp.length; i++) {
              if ($.inArray(update_dp[i].port_no,live.ports)<0 ) { 
                // is in update but not in data  
                // old, but left for reference // console.log('adding \'live but not local\' port '+update_dp[i].port_no);
                // //  && !OFPorts.hasOwnProperty(update_dp[i].port_no)
                live.ports.push(update_dp[i].port_no);
                this.live_data[dpid].adjacent_nodes = topo.get_links(dpid);
              }
            }
            if (live.ports.length != update_dp.length) {
              var new_ports = [];
              for (var i = 0; i<live.ports.length; i++) {
                if ($.inArray(live.ports[i],update_dp)>=0) { // is local but not in update
                  console.log('in local, and in update, so save it');
                  new_ports.push(live.ports[i]);           // save ports in both
                }
                else {
                  console.log('removing from live ports'); // removed by replacing live.ports with new_ports below
                  /* remove from adjacent nodes */
                  for (var n = 0; n<this.live_data.adjacent_nodes.length; n++) {
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
            
            /* TODO: add exponential smoothing to the aggregate values */
            if (this.exponSmoothing) {
              console.log(live.aggregate.arrival_rate);
              var prev_total_in = live.aggregate.arrival_rate; // if first node, allow to ramp up slowly
              var current_total_in = total_in*this.alpha + prev_total_in*(1-this.alpha);
              console.log(current_total_in);
              live.aggregate.arrival_rate = current_total_in;
            }
            else {
              live.aggregate.arrival_rate = total_in;
            }
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
    event_update_controller: function (toponodes, update) {
        console.log('controller stats received');
        console.log(JSON.stringify(update));
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
      if (dpid_exists(dpid)) {
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
      for(var dpid in this.node_data) {
        if (dpid_exists(dpid)) {
          var ret = {
            'service_rate': {'live':this.node_data[dpid].service_rate,'adjustment':this.node_data[dpid].adjustments.service_rate},
            'arrival_rate': {'live':this.live_data[dpid].aggregate.arrival_rate, 'adjustment':this.node_data[dpid].adjustments.arrival_rate},
            'queue_capacity': {'live':this.node_data[dpid].queue_capacity, 'adjustment': this.node_data[dpid].adjustments.queue_capacity}
          }
          /* make sure alterations don't go below 0 */
          for(var a in ret) {
            if ((ret[a].live + ret[a].adjustment) < 0) ret[a].adjustment = 0-ret[a].live;}
          all_data[dpid] = ret;
        }
      }
      return all_data;
    },
    get_model_input_all: function() {
      var all_data = {};
      for(var dpid in this.node_data) {
        all_data[dpid] = this.get_model_input_dpid(dpid);
      }
      return all_data;
    },
    clearAdjustments: function() {
      for (var dpid in this.node_data) {
        if (dpid_exists(dpid)) {
          this.node_data[dpid].adjustments = {
            'service_rate':   0,
            'arrival_rate':   0,
            'pnf':            0, 
            'queue_capacity': 0,
            'ports':          [] 
          }
        }
      }
    }
}

var edit_mode = {
    active: false,
    saved_pf_data: '',
    saved_topo_data: '',
    enter: function(pf_data,toponodes) {
      // stop updates
      // clone and store the data
      this.saved_pf_data   = jQuery.extend(true,{}, pf_data);
      this.saved_topo_data = jQuery.extend(true,{}, toponodes);
    },
    add_switch: function(new_switch) {
      // add to pf_data
      // add to 
    },
    remove_switch: function(dpid) {
      
    },
}

var model = {
    get_output_dpid: function(dpid,input) {
      var model = pf_data.node_data[dpid].queueing_model;
      if (config.queueing_models[model]) {
          // console.log('Running '+model+' model on \''+dpid+'\' brand');
          return this.compute(model,pf_data.get_model_input_dpid(dpid));
        } else console.log('not a valid brand');
    },
    get_output_all: function() {
      var all_data = {};
      for (var dpid in pf_data.node_data) {
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
      for (var parameter = 0; parameter < model_config.model_out.length; parameter++) {
          fn = model_config.model_out[parameter]; // get function defined in model
          results[fn] = model[fn]();
      }
      // console.log(JSON.stringify(results));
      
      return results;
    }
}

var Node = function(dpid) {
  this.dpid = dpid;
  this.ports = []; // dpid of the port
  this.proportions = []; // proportion of each node in ports
  this.neighbours = [];
}
var spanningtree = { /* A directed, rooted spanning tree */
  root: '',
  members: [], // list of dpids
  nodes: [],   // list of Nodes
  populate_node: function(member,pfnd) { /* populates an existing node */
    var debug = false;
    var currnode = this.nodes[member];
    var numNeigh = pfnd.adjacent_nodes.length;
    var neighs   = pfnd.adjacent_nodes;
    if (debug) console.log('  ('+member+'-plt) #adjnde: '+numNeigh);
    
    // console.log(JSON.stringify(neighs,null,2));
    
    // add ports connecting to switches
    for (var i = 0; i < numNeigh; i++) {
      /* ignore OF ports, like LOCAL */
      if ($.inArray(neighs[i].port_no,OFPorts)<0) { 
        
        var dpidNeigh = neighs[i].neighbour.dpid;
        if(!this.contains(dpidNeigh)) { /* reverse links */
            // create and add to members
            var newNeigh = new Node(dpidNeigh);
            this.members.push(dpidNeigh);
            this.nodes.push(newNeigh);
            currnode.neighbours.push(newNeigh);
        
            if (debug) console.log('  ('+member+'-plt) maknegh: '+dpidNeigh);
            
            // get port proportions
            var pnum = neighs[i].port_no; // find this ports proportions
            currnode.ports.push(pnum); 
            if (debug) console.log('  ('+member+'-plt) propprt: '+pnum);
            
            for (var j = 0; j < pfnd.proportion_out.length; j++) {
                var propNeigh = pfnd.proportion_out[j];
                if (debug)  console.log('  ('+member+'-plt) tstprop: '+propNeigh.port_no);
                if (parseInt(propNeigh.port_no) == parseInt(pnum)) {
                    if (debug) console.log('  ('+member+'-plt) addprop: p'+propNeigh.port_no+' '+propNeigh.proportion.toFixed(3));
                    currnode.proportions.push(propNeigh.proportion);
                    break;
                }
            }
        }
      }
    }
    
    /* Add the host ports, only important if root has hosts */
    // only need to add the proportion to the end of the array, it doesn't need more than that
    if (numNeigh < pfnd.proportion_out.length) {
        var prop_out = pfnd.proportion_out;
        if (debug) console.log('  ('+member+'-plt) hstexst: #hosts:'+(prop_out.length-numNeigh));
        
        var neigh_ports = [];
        for (var i = 0; i < neighs.length; i++) {
            neigh_ports.push(parseInt(neighs[i].port_no))
        }
        // console.log('neighs:   '+neigh_ports);
        // console.log('prop_out: '+JSON.stringify(prop_out));

        // host link won't be in adjacent nodes.[i].port_not
        for (var i = 0; i < prop_out.length; i++) {
            if ($.inArray(parseInt(prop_out[i].port_no),neigh_ports)<0) {
                currnode.proportions.push(prop_out[i].proportion);
                if (debug) console.log('  ('+member+'-plt) hstport: '+(prop_out[i].port_no));
            }
        }
    }
    
    if (debug) console.log('  ('+member+'-plt) ports:   '+JSON.stringify(currnode.ports)); // may not be in the correct place..
  },
  create_tree: function(src,live_data) { // create_tree('root', pf_data.live_data);
    if (!dpid_exists(src)) {
      return;
    }
    this.members = [];
    this.nodes = [];
    var debug = false;
    
    this.members.push(src);
    this.root = new Node(src);
    this.nodes.push(this.root);
    
    /* populate and add neighbours to members and nodes
        currently empty, so begin populating with root  */
    var currMem = 0;
    if (debug) console.log('  ('+currMem+'-cre) root:    '+src)
    else console.log('creating tree, rooted on '+src);
    
    while (currMem < this.members.length) {
      var currdpid = this.members[currMem];
      var pfnd = live_data[currdpid];
      if (debug) console.log('processing: \n'+
          '  ('+currMem+'-cre) currMem: '+currMem+'\n'+
          '  ('+currMem+'-cre) dpid:    '+currdpid);
      
      // populate node
      this.populate_node(currMem, pfnd)
      
      currMem++;
    }
  },
  adjust_traffic: function(arrival_rate_delta, proportion_fn, pf_data) {
    
    var debug = false;
    var deltas = [];
    deltas.push(arrival_rate_delta); // root's delta
    
    /* at each step, 
      * create alteration in pf_data.node_data which reflects this arrival_rate_delta
      * get result of division algorithm */ 
    for (var i = 0; i<this.members.length; i++) {
      var n_curr = this.members[i];
      if (debug) console.log('  ('+i+'-adj) n_curr:  '+n_curr);
      if (debug) console.log('  ('+i+'-adj) delta:  '+deltas[i]);
      pf_data.set_adjustment(n_curr, 'arrival_rate', deltas[i])
      var proportions = proportion_fn(i, this.nodes);
      
      /* Divide up flows among ports */ 
      for (var p = 0; p < proportions.length; p++) {
        deltas.push(proportions[p]*deltas[i]);
        if (debug) console.log('  ('+i+'-adj) prop:  '+proportions[p]*deltas[i]);
      }
    }
  },
  get_proportion_prop: function(member, nodes) { /* divide according to proportion_out distributions */
    var proportions = [];
    var sum = 0; 
    var prop_out = ''; // for debug
    var debug = false;
    
    var currnode = nodes[member];
    
    if (debug) console.log('  ('+member+'-gpp) proprtn: '+JSON.stringify(currnode.proportions));
    for (var i = 0; i < currnode.proportions.length; i++) { sum += currnode.proportions[i]; }
    
    // if (sum == 0) currnode.proportions[i] = 1; // ###### TODO IS HERE ###### case of sum == 0 ######
    
    if (debug) console.log('  ('+member+'-gpp) sum:   '+sum.toFixed(3));
    
    for (var i = 0; i < currnode.proportions.length; i++) {
        if (debug) console.log('  ('+member+'-gpp)   node:  '+currnode.proportions[i].toFixed(3));
        proportions[i] = currnode.proportions[i]/sum;
        prop_out = prop_out +' '+proportions[i].toFixed(3);
    }
    
    if (debug) console.log('  ('+member+'-gpp) proprtn: '+prop_out);
    return proportions;
  },
  get_proportion_equal: function(member, nodes) { /* divide evenly between the ports */
    var proportions = [];
    var prop_out = ''; // for debug
    var debug = false;
    
    var currnode = nodes[member];
    if (debug) console.log('  ('+member+'-gpe) nodelen:*'+currnode.proportions.length);
    for (var i = 0; i < currnode.proportions.length; i++) { 
        proportions[i] = 1/currnode.proportions.length;
        prop_out = prop_out +' '+proportions[i].toFixed(3);
        if (debug) console.log('  ('+member+'-gpe)    node: '+proportions[i].toFixed(3));
    }
    if (debug) console.log('  ('+member+'-gpe) proprtn: '+prop_out);
    return proportions;
  },
  contains: function(dpid) { /* true if dpid has been visited */
    if ($.inArray(dpid,this.members)>=0) {
      return true;
    }
    return false;
  },
}



/*
  Functions and data for offline editing:
    - Sample: samples stat and topo data
    - initLocal: initializes the data structures, starts a random update loop
    - stopLocal: kills the random loop
    - setSampleData: sets the arrival rate of the sample data, stops local loop
*/

var sample = {
  data: {
    "0000000000000001": [
      {"port_no": "1", "rx_packets": 0, "tx_packets": 0, "arrival_rate": 100.1, "depart_rate": 101.1, "total_tx": 100, "total_rx": 100, "uptime": 0},
      {"port_no": "2", "rx_packets": 0, "tx_packets": 0, "arrival_rate": 100.2, "depart_rate": 101.2, "total_tx": 100, "total_rx": 100, "uptime": 0},
    ],
    "0000000000000002": [
      {"port_no": "1", "rx_packets": 0, "tx_packets": 0, "arrival_rate": 200.1, "depart_rate": 201.1, "total_tx": 100, "total_rx": 100, "uptime": 0},
      {"port_no": "2", "rx_packets": 0, "tx_packets": 0, "arrival_rate": 200.2, "depart_rate": 201.2, "total_tx": 100, "total_rx": 100, "uptime": 0},
    ]
  },
  controller: {
    "packet_in_delta":12,
    "packet_in_total":70,
    "duration":1,
    "up_time":20,
    "switches":[
      {"total_packet_in":12,"dpid":1},
      {"total_packet_in":17,"dpid":2},
      {"total_packet_in":5,"dpid":3},
      {"total_packet_in":6,"dpid":4},
      {"total_packet_in":18,"dpid":5},
      {"total_packet_in":6,"dpid":6},
      {"total_packet_in":6,"dpid":7}
    ],
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

function setSampleArv(arv) {
    stopLocal()
    for (var dpid in sample.data) {
      for (var i = 0; i< sample.data[dpid].length; i++) {
          sample.data[dpid][i].arrival_rate = arv;
       }
    }
    pf_data.event_update_statistics(topo.nodes,sample.data);
    console.log('successful update');
    update_gui();
}

function initLocal() {
    topo.initialize({switches: sample.switches, links: sample.links});
    elem.update();
    pf_data.event_update_statistics(topo.nodes,sample.data);
    pf_data.event_update_controller(sample.controller);
    $('#loading').hide();
    $('#control-panel').show();
    update_gui();
    
    var random_sample_data = function() {
      for (var dpid in sample.data) {
        for (var i = 0; i< sample.data[dpid].length; i++) {
          sample.data[dpid][i].arrival_rate = Math.round(Math.random() * 9500) + 500;
          sample.data[dpid][i].uptime+=2;
    }} };
    
      
    offlineLoop = setInterval(function(s) {
      random_sample_data();
      pf_data.event_update_statistics(topo.nodes,sample.data);
      console.log('successful update');
      $('#loading').hide();
      $('#control-panel').show();
      update_gui();
    }, 2000);
}

function stopLocal() {
    clearInterval(offlineLoop)
}

var offlineLoop = 'none';
/* Control for swapping between local and server modes. Comment one. */
// initLocal();    // for offline testing, omgoodness this really upsets the server if left on when running server mode..
initServer();   // for server
