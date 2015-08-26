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
    
    // create and send RPC reply
    var result = "";
    try {
      result = pf_data[new_data.method](topo.nodes,new_data.params[0]);
      if (result == NOT_READY) {
        console.log('not ready');
      }
      else {
        console.log('successful update');
        update_gui();
      }
      result = "";
    } catch(err) {console.log("ERROR"+err);}
    
    var ret = {"id": new_data.id, "jsonrpc": "2.0", "result": result};
    console.log("ws_performance returning: ",JSON.stringify(ret));
    this.send(JSON.stringify(ret));
}

var dpid_exists = function(dpid) {
  if (!(pf_data.node_data[dpid])) {
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
          'departure_rate': 0, 
          'proportion_in':  [],
          'proportion_out': [] 
        },
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
            
            // console.log("====== Now Updating ======");
            // console.log("====== "+dpid+" ======");
            
            
            if (update_dp === "loading") {
              console.log('Controller still loading');
              return NOT_READY;
            }
            
            // console.log('checking ports are same')
            /* check ports are the same */
            for (var i = 0; i<update_dp.length; i++) {
              if (!$.inArray(update_dp[i],live.ports)) { // is in update but not local
                live.ports.push(update_dp[i].port_no);
                /* TODO add to adjacent nodes using toponodes */
              }
            }
            if (live.ports.length != update_dp.length) {
              var new_ports = [];
              for (var i = 0; i<live.ports.length; i++) {
                if ($.inArray(live.ports[i],update_dp)) { // is local but not in update
                  new_ports.push(live.port[i]);           // save ports in both
                }
                else {
                  /* TODO remove from adjacent nodes */
                  /* TODO remove from adjustments */
                }
              }
              live.ports = new_ports;
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
            live.aggregate.proportion_in = [];
            live.aggregate.proportion_out = [];
            
            for (var i = 0; i<rate_in.length; i++) {
              live.aggregate.proportion_in.push({'port_no':rate_in[i].port_no,'proportion':rate_in[i].proportion/total_in});
              live.aggregate.proportion_out.push({'port_no':rate_out[i].port_no,'proportion':rate_out[i].proportion/total_out});
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
          return this.output(model,pf_data.get_model_input_dpid(dpid));
        } else console.log('not a valid brand');
    },
    get_output_all: function() {
      var all_data = {};
      for (dpid in pf_data.node_data) {
        all_data[dpid] = this.get_output_dpid(dpid);
      }
      return all_data;
    },
    output: function(model_name, input) {
      var model_config = config.queueing_models[model_name];
      var model = config.get_model[model_name];
      
      var model_in = {};
      /* Check input data */
      for (var i = 0; i < model_config.model_in.length; i++) {
          val = model_config.model_in[i];
          if (!val in input) {
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

var update_gui = function () { /* Updates the displayed performance values */
    var data_in = pf_data.get_model_input_all();
    var data_out = model.get_output_all();
    elem.stats.selectAll(".dpid").text(  function(d) {
            return "dpid:    "+dpid_to_int(d.dpid); });
    elem.stats.selectAll(".lambda").text(  function(d) { 
            return LAM+":    "+data_in[d.dpid].arrival_rate.toFixed(2); });
    elem.stats.selectAll(".mu").text(  function(d) { 
            return MU+":     "+data_in[d.dpid].service_rate.toFixed(2); });
    elem.stats.selectAll(".sojourn").text(  function(d) { 
            return "sojourn: "+data_out[d.dpid].sojourn.toFixed(4); });
    elem.stats.selectAll(".load").text(  function(d) { 
            return "load:    "+data_out[d.dpid].load.toFixed(4); });
    elem.stats.selectAll(".bufflen").text(  function(d) { 
            return "length:  "+data_out[d.dpid].length.toFixed(4); });
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
    pf_data.event_update_statistics(topo.nodes,sample);
    update_gui();
}

init_local(); // for offline testing
// main();    // for server