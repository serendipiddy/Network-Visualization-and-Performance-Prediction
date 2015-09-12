from ryu.app.wsgi import WSGIApplication
from ryu.base import app_manager

from ryu.lib import hub
from ryu.lib.dpid import dpid_to_str
from ryu.controller.handler import MAIN_DISPATCHER, DEAD_DISPATCHER
from ryu.controller.handler import set_ev_cls
from ryu.controller import ofp_event

from socket import error as SocketError
from tinyrpc.exc import InvalidReplyError

import sys
import process_stats_port as process
import process_stats_flow as processf
from performance_server import PerformanceServerController


# from ryu.topology.api import get_switch, get_link
# import json

class PerformanceServerApp(app_manager.RyuApp):
    _CONTEXTS = {
        'wsgi': WSGIApplication,
    }

    def __init__(self, *args, **kwargs):
        super(PerformanceServerApp, self).__init__(*args, **kwargs)

        wsgi = kwargs['wsgi']
        wsgi.register(PerformanceServerController, {'performance_app': self})
        # Register the controller class below, allowing it to listen to controller events
        
        print('Making VisServerApp')
        self.rpc_clients = []            # list of all the connected clients to update
        self.datapaths = {}              # list of switches
        self.monitor_thread = hub.spawn(self.monitor)  
                                         # tasklet to monitor schedule statistic requests
        self.req_count = 0               # count the number of requests made
        
        # These are assigned in _port_stats_reply_handler()
        self.prevreadings = {}           # previous network readings
        self.currentstats = {}           # current network statistics
        self.logging = False
        self.waittime = 1
        self.placeholder = 'loading'
        self.statstype = 'port'          # 'port' or 'flow', depending on the desired statistics


    @set_ev_cls(ofp_event.EventOFPStateChange, [MAIN_DISPATCHER, DEAD_DISPATCHER])
    def _state_change_handler(self, ev):
        """Adds and removes the existing switches from this classes records.
            On first run, populates self.datapaths:"""
        datapath = ev.datapath
        
        if ev.state == MAIN_DISPATCHER:  # Existing switches
            if not datapath.id in self.datapaths:
                self.logger.debug('register datapath: %016x', datapath.id)
                self.datapaths[datapath.id] = datapath
                self.prevreadings[dpid_to_str(datapath.id)] = self.placeholder
                # self.currentstats[dpid_to_str(datapath.id)] = self.placeholder 
        elif ev.state == DEAD_DISPATCHER: # Removed switches
            if datapath.id in self.datapaths:
                self.logger.debug('unregister datapath: %016x', datapath.id)
                del self.datapaths[datapath.id]
                # del self.currentstats[datapath.id]


    """Requests statistics for each switch stored
        Instated by self.monitor_thread"""
    def monitor(self):
        self.logger.info("Starting stats monitor")
        while True:
            count = 0
            for dp in self.datapaths.values():
                if (self.statstype == 'flow'):
                  self.send_flow_stats_request(dp)
                elif (self.statstype == 'port'):
                  self.send_port_stats_request(dp)
                count += 1
                
                ## topology experimenting
                # links = get_link(self)
                # body = json.dumps([link.to_dict() for link in links])
                # print("%d %s" % (dp.id, body))
                
            if self.datapaths.values():
                self.req_count += 1
                # print("Counted %d datapaths. Request #%d sent" % (count, self.req_count))
                sys.stdout.write('Counted %d datapaths. Request #%d sent' % (count, self.req_count))
                sys.stdout.flush();
            hub.sleep(self.waittime)
            self.rpc_broadcall('event_update_statistics',self.currentstats)


    def rpc_broadcall(self, func_name, msg):
        """Copied from ws_topology"""
        disconnected_clients = []

        self.data=msg
        for rpc_client in self.rpc_clients:
            # NOTE: Although broadcasting is desired,
            #       RPCClient#get_proxy(one_way=True) does not work well
            rpc_server = rpc_client.get_proxy()
            try:
                getattr(rpc_server, func_name)(msg)
            except SocketError:
                self.logger.debug('WebSocket disconnected: %s', rpc_client.ws)
                disconnected_clients.append(rpc_client)
            except InvalidReplyError as e:
                self.logger.debug("InvalidReplyError: ")
                self.logger.error(e)

        for client in disconnected_clients:
            self.rpc_clients.remove(client)


    """Sends a port statistics request for all ports on datapath"""
    def send_port_stats_request(self, datapath):
        ofp = datapath.ofproto
        ofp_parser = datapath.ofproto_parser
        req = ofp_parser.OFPPortStatsRequest(datapath, 0, ofp.OFPP_ANY)
        datapath.send_msg(req)
        
    @set_ev_cls(ofp_event.EventOFPPortStatsReply, MAIN_DISPATCHER)
    def _port_stats_reply_handler(self, ev):
        current_data = process.stats_event(ev, self.logging)
        dp = current_data['datapath']
        
        current_stats = process.avg_rates(current_data, self.prevreadings[dp], self.placeholder)
        
        self.prevreadings[dp] = current_data['ports']
        self.currentstats[dp] = current_stats
        
    """ Sends a statistics request for flows """
    def send_flow_stats_request(self, datapath):
        ofp = datapath.ofproto
        ofp_parser = datapath.ofproto_parser
        
        cookie = cookie_mask = 0
        match = ofp_parser.OFPMatch()
        req = ofp_parser.OFPFlowStatsRequest(datapath, 0, ofp.OFPTT_ALL, # any table, port, group
                ofp.OFPP_ANY, ofp.OFPG_ANY, cookie, cookie_mask, match)
        datapath.send_msg(req)
        
        
    @set_ev_cls(ofp_event.EventOFPFlowStatsReply, MAIN_DISPATCHER)
    def flow_stats_reply_handler(self, ev):
        current_flows = processf.stats_event(ev, self.logging)
        dp = current_flows['datapath']
        
        current_stats = processf.avg_rates(current_flows, self.prevreadings[dp], self.placeholder)
        
        self.prevreadings[dp] = current_flows['flows']
        self.currentstats[dp] = current_stats
        

# app_manager.require_app('ryu.app.simple_switch_13') # Causes chaos to ensue
app_manager.require_app('ryu.app.rest_topology')
app_manager.require_app('ryu.app.ws_topology')