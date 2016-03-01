var CONF = {
    image: {
        width: 50,
        height: 40
    },
    force: {
        width: $(window).width()-250-300, // for tests, make this static -vis.graphs.w_border, // 250 is for control panel and scroll bar
        height: 500,
        dist: 190,
        charge: -1000
    },
    node: {
        radius: 20,
        size: 20
    },
    port: {
        radius: 4
    }
};

/* Topology functions */
/* SVG element binding */
measure_latency.event_occured('loading_topofile_begin');

var ws = new WebSocket("ws://" + location.host + "/v1.0/topology/ws");
ws.onmessage = function(event) {
    var data = JSON.parse(event.data);
    // console.log("WS.ONMESSAGE()"+event.data);
    
    var result = rpc[data.method](data.params);

    var ret = {"id": data.id, "jsonrpc": "2.0", "result": result};
    this.send(JSON.stringify(ret));
}

var glob = "";
var LAM = String.fromCharCode(parseInt("03BB",16));
var MU = String.fromCharCode(parseInt("03BC",16));

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
    svg: d3.select("#view-topo").append("svg")
        .attr("id", "topology")
        .attr("width", CONF.force.width)
        .attr("height", CONF.force.height),
};
/* Returns the translation string for movements.  */
function movement(dx, dy, radius) {
  dx = Math.max(radius, Math.min(CONF.force.width - radius, dx));
  dy = Math.max(radius, Math.min(CONF.force.height - radius, dy));
  return "translate(" + dx + "," + dy + ")";
}

function _tick() {
    elem.link.attr("x1", function(d) { return d.source.x; })
        .attr("y1", function(d) { return d.source.y; })
        .attr("x2", function(d) { return d.target.x; })
        .attr("y2", function(d) { return d.target.y; });

    elem.node.attr("transform", function(d) { return movement(d.x, d.y, CONF.node.radius); });
    elem.stats.attr("transform", function(d) { return movement(d.x, d.y, CONF.node.radius); });
    elem.port.attr("transform", function(d) {
        var p = topo.get_port_point(d);
        return movement(p.x, p.y, CONF.port.radius);
    });
}
elem.drag = elem.force.drag().on("dragstart", _dragstart);
function _dragstart(d) {
    var dpid = dpid_to_int(d.dpid)

    // d3.select(this).classed("fixed", d.fixed = true);  // 'stick' nodes when clicked
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
    nodeEnter.append("circle")
        .attr("class","switch-circle")
        .attr("cx", -CONF.node.size/2)
        .attr("cy", -CONF.node.size/2)
        .attr("r", CONF.node.size)
        .attr("stroke", "black")
        .attr("stroke-width", 1)
        .attr("fill", "white");
    nodeEnter.append("text")
        .attr("dx", function(d) {
            length = trim_zero(d.dpid).length;
            return -CONF.node.size/2-(3*length);
        })
        .attr("dy", function(d) {
            length = trim_zero(d.dpid).length;
            return -CONF.node.size/2+(4*length);
        })
        .text(function(d) { return trim_zero(d.dpid); });
    
    /* Statistics */
    vis.set_gui_text(this, topo.nodes);
        
    /* Ports */
    var ports = topo.get_ports();
    this.port.remove();
    
    this.port = this.svg.selectAll(".port").data(ports);
    var portEnter = this.port.enter().append("g")
        .attr("class", "port");
    portEnter.append("circle")
        .attr("r", CONF.port.radius*2);
    portEnter.append("text")
        .attr("dx", -3)
        .attr("dy", 3)
        .text(function(d) { return trim_zero(d.port_no)+" "; });
};

function is_valid_link(link) {
    return (link.src.dpid < link.dst.dpid)
}

var topo = {
    debug: false,
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
            if (self.debug) console.log("add link: " + JSON.stringify(links[i]));

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
            if (self.debug) console.log("delete switch: " + JSON.stringify(nodes[i]));

            node_index = this.get_node_index(nodes[i]);
            this.nodes.splice(node_index, 1);
        }
        this.refresh_node_index();
    },
    delete_links: function (links) {
        for (var i = 0; i < links.length; i++) {
            if (!is_valid_link(links[i])) continue;
            if (self.debug) console.log("delete link: " + JSON.stringify(links[i]));

            link_index = this.get_link_index(links[i]);
            this.links.splice(link_index, 1);
        }
    },
    get_node_index: function (node) {
        for (var i = 0; i < this.nodes.length; i++) {
            if (node.dpid === this.nodes[i].dpid) {
                return i;
            }
        }
        return null;
    },
    get_link_index: function (link) {
        for (var i = 0; i < this.links.length; i++) {
            if (link.src.dpid === this.links[i].port.src.dpid &&
                    link.src.port_no === this.links[i].port.src.port_no &&
                    link.dst.dpid === this.links[i].port.dst.dpid &&
                    link.dst.port_no === this.links[i].port.dst.port_no) {
                return i;
            }
        }
        return null;
    },
    get_links: function(dpid) { /* Added for pf_data */
      _links = [];
      // {port_no: {dpid:, port_no:}}
      for(var i = 0; i<this.links.length; i++) { // iterate through links
        if(this.links[i].port.src.dpid == dpid) {
          _links.push(
            { 'port_no': this.links[i].port.src.port_no,
              'topo_node_idx': this.links[i].source.index,
              'neighbour': 
              {
                'dpid': this.links[i].port.dst.dpid,
                'port': this.links[i].port.dst.port_no,
                'topo_node_idx': this.links[i].target.index
              }
            }
          );
        }
        else if (this.links[i].port.dst.dpid == dpid) {
          _links.push(
            { 'port_no': this.links[i].port.dst.port_no,
              'topo_node_idx': this.links[i].target.index,
              'neighbour': 
              {
                'dpid': this.links[i].port.src.dpid,
                'port': this.links[i].port.src.port_no,
                'topo_node_idx': this.links[i].source.index
              }
            }
          );
        }
      }
      return _links;
    },
    get_ports: function () {
        var ports = [];
        var pushed = {};
        for (var i = 0; i < this.links.length; i++) {
            function _push(p, dir) {
                key = p.dpid + ":" + p.port_no;
                if (pushed.hasOwnProperty(key)) {
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

function initialize_topology() {
    
    d3.json("/v1.0/topology/switches", function(error, switches) {
        d3.json("/v1.0/topology/links", function(error, links) {
            topo.initialize({switches: switches, links: links});
            elem.update();
        });
    });
}

function initServer() { // 'main()' from ryu.topology.js
    initialize_topology();
}

measure_latency.event_occured('loading_topofile_end');
