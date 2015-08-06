import json
from webob import Response

from ryu.app.wsgi import route
from ryu.lib import dpid as dpid_lib
from ryu.topology.api import get_switch #, get_link

# from ryu.app.perf_monitor import TestPerfMonitor

from ryu.app.wsgi import (
    ControllerBase,
    WSGIApplication,
    websocket,
    WebSocketRPCClient
)

from operator import attrgetter

from socket import error as SocketError
from ryu.contrib.tinyrpc.exc import InvalidReplyError

from ryu.app import simple_switch_13
from ryu.lib import hub
from ryu.lib.dpid import dpid_to_str
from ryu.controller.handler import MAIN_DISPATCHER, DEAD_DISPATCHER
from ryu.controller.handler import set_ev_cls
from ryu.controller import ofp_event

from ryu.base import app_manager

# REST API for switch configuration
#
# get all the switches
# GET /v1.0/performance/

class TestPerfServerApp(app_manager.RyuApp):
# class TestPerfServerApp(simple_switch_13.SimpleSwitch13):
    _CONTEXTS = {
        'wsgi': WSGIApplication,
    }
    
    placeholder = 'loading'
    waittime = 5
    logging = False

    def __init__(self, *args, **kwargs):
        """Monitors the performance of the network"""
        super(TestPerfServerApp, self).__init__(*args, **kwargs)
        
        # print('new tpm kwargs:' + str(kwargs))
        
        wsgi = kwargs['wsgi']
        wsgi.register(TestPerfController, {'performance_app': self}) 
                                         # Register the controller class below, allowing it to listen to controller events
        print('Making PerfServerApp')
        self.rpc_clients = []            # list of all the connected clients to update
        self.datapaths = {}              # list of switches
        self.monitor_thread = hub.spawn(self._monitor)  
                                         # tasklet to monitor schedule statistic requests
        self.req_count = 0               # count the number of requests made
        
        # These are assigned in _port_stats_reply_handler()
        self.prevreadings = {}           # previous network readings
        self.currentstats = {}           # current network statistics
        
    @set_ev_cls(ofp_event.EventOFPStateChange, [MAIN_DISPATCHER, DEAD_DISPATCHER])
    def _state_change_handler(self, ev):
        """Adds and removes the existing switches from this classes records.
            On first run, populates self.datapaths:"""
        datapath = ev.datapath
        
        if ev.state == MAIN_DISPATCHER:  # Existing switches
            if not datapath.id in self.datapaths:
                self.logger.debug('register datapath: %016x', datapath.id)
                if (self.logging):
                  self.logger.info('State Change: register datapath %016x', datapath.id)
                self.datapaths[datapath.id] = datapath
                self.currentstats[dpid_to_str(datapath.id)] = self.placeholder 
                self.prevreadings[dpid_to_str(datapath.id)] = self.placeholder
                
        elif ev.state == DEAD_DISPATCHER: # Removed switches
            if datapath.id in self.datapaths:
                self.logger.debug('unregister datapath: %016x', datapath.id)
                self.logger.info('State Change: unregister datapath %016x', datapath.id)
                del self.datapaths[datapath.id]
                del self.currentstats[datapath.id]
        
    def _monitor(self):
        """Requests statistics for each switch stored
            Instated by self.monitor_thread"""
        self.logger.info("Monitor loop starting")
        while True:
            count = 0
            for dp in self.datapaths.values():
                self.send_port_stats_request(dp)
                # self.send_test_requests(dp)
                count += 1
            if self.datapaths.values():
                self.req_count += 1
                print("Counted %d datapaths. Request #%d sent" % (count, self.req_count))
            hub.sleep(self.waittime)
            # key = self.currentstats.keys()[0]
            self._rpc_broadcall('event_update_statistics',self.currentstats)
        
    def send_port_stats_request(self, datapath):
        """Sends a port statistics request for all ports on datapath"""
        ofp = datapath.ofproto
        ofp_parser = datapath.ofproto_parser
        
        req = ofp_parser.OFPPortStatsRequest(datapath, 0, ofp.OFPP_ANY)
        datapath.send_msg(req)
        
    @set_ev_cls(ofp_event.EventOFPPortStatsReply, MAIN_DISPATCHER)
    def _port_stats_reply_handler(self, ev):
        current_data = self.process_stats(ev)
        dp = current_data['datapath']
        previous_port_data = self.invert_prev(self.prevreadings[dp])
        current_stats = []
        
        # check dp exists in class variables
        # print("==dp#"+dp)
        
        ### Calculate the current average rates ###
        for p in current_data['ports']: # for each port in dp
          port_no = p['port_no']
          port_stats = {'port_no':port_no}
          # print("  cur "+str(port_no)+" "+str(p))
          # print("  pre   "+str(previous_port_data[port_no]))
          
          # find the difference between current and old stats
          if (previous_port_data == self.placeholder):
            duration = p['duration_sec']
            port_stats['arrival'] = float(p['rx_packets'])/duration
            port_stats['depart'] = float(p['tx_packets'])/duration
          else:
            prev_data = previous_port_data[port_no]
            duration = p['duration_sec'] - prev_data['duration_sec']
            port_stats['arrival'] = float(p['rx_packets'] - prev_data['rx_packets'])/duration
            port_stats['depart'] = float(p['tx_packets'] - prev_data['tx_packets'])/duration
          
          port_stats['tx_packets'] = p['tx_packets']
          port_stats['rx_packets'] = p['rx_packets']
          
          current_stats.append(port_stats)
          # calculate the average
        
        self.prevreadings[dp] = current_data['ports']
        self.currentstats[dp] = current_stats
        # print(current_stats)
        
    def invert_prev(self, port_array):
        """ Transforms an array of ports into a dictionary, referenced by port number """
        if port_array == self.placeholder:
          return port_array 
        prev = {}
        for p in port_array:
          prev[p['port_no']] = p
          
        return prev
        
    def process_stats(self, ev):
        body = ev.msg.body
        
        # make a dictionary
        data = {
            'datapath': dpid_to_str(ev.msg.datapath.id),
            'ports': []
        }
        
        # draw header row
        if (self.logging):
          self.logger.info('Datapath %016x:\n%8s %8s %8s %8s %8s %8s %8s' 
                      % (ev.msg.datapath.id,'port','received','sent','rx_drop','tx_drop','sec','nano'))
        
        # add each port's statistic
        for stat in sorted(body, key=attrgetter('port_no')): # sort by port number
            port = {
                'port_no': stat.port_no,
                'rx_packets': stat.rx_packets,
                'tx_packets': stat.tx_packets,
                'rx_dropped': stat.rx_dropped,
                'tx_dropped': stat.tx_dropped,
                'duration_sec': stat.duration_sec,
                'duration_nano': stat.duration_nsec
              }
            data['ports'].append(port)
            
            if (self.logging):
              self.logger.info('%8x %8d %8d %8d %8d %8d %8d' % (
                                stat.port_no,
                                stat.rx_packets, stat.tx_packets,
                                stat.rx_dropped, stat.tx_dropped,
                                stat.duration_sec, stat.duration_nsec))
        
        return data
        
    def _rpc_broadcall(self, func_name, msg):
        """Copied from ws_topology"""
        disconnected_clients = []
        # print(msg)
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
                self.logger.error(e)

        for client in disconnected_clients:
            self.rpc_clients.remove(client)
        
class TestPerfController(ControllerBase):
    """Should only be used to link WSGI to the performance stats"""
    def __init__(self, req, link, data, **config):
        super(TestPerfController, self).__init__(req, link, data, **config)
        print('creating testperfcontroller')
        
        self.performance_app = data['performance_app'] 
                                         # used to access the functions available in the performance API?
        
    @websocket('performance','/v1.0/performance/ws')
    def get_performance_ws(self, ws):
        """Creates the websocket link to client"""
        print('new ws client')
        rpc_client = WebSocketRPCClient(ws)
        self.performance_app.rpc_clients.append(rpc_client)
        rpc_client.serve_forever()
        
    @route('performance', '/v1.0/performance/current', methods=['GET'])
    def get_performance(self, req, **kwargs):
        """Responds with the value of _stats"""
        return self._stats(req, **kwargs)
        
    def _stats(self, req, **kwargs):
        """Get any kind of statistics from the network"""
        # return Response(content_type='application/json', body="Received")
        body = json.dumps(self.performance_app.currentstats)
        return Response(content_type='application/json', body=body)
        
    def _switches(self, req, **kwargs):
        """Get switch information from topology.switches"""
        dpid = None
        if 'dpid' in kwargs:
            dpid = dpid_lib.str_to_dpid(kwargs['dpid'])
        switches = get_switch(self.performance_api_app, dpid)
        body = json.dumps([switch.to_dict() for switch in switches])
        return Response(content_type='application/json', body=body)
     
# app_manager.require_app('ryu.app.simple_switch_13') # Causes chaos to ensue