from ryu.controller import ofp_event
from ryu.controller.handler import CONFIG_DISPATCHER, MAIN_DISPATCHER
from ryu.controller.handler import set_ev_cls
from ryu.ofproto import ofproto_v1_3

'''
  Records the packet_in traffic and which switch it came from
'''

class PacketInCounter():
    OFP_VERSIONS = [ofproto_v1_3.OFP_VERSION]

    def __init__(self, *args, **kwargs):
        super(PacketInCounter, self).__init__(*args, **kwargs)
        self.mac_to_port = {}
        self.dp_packet_in = {} # {dpid:, count:}
        self.total_packet_in = 0

    @set_ev_cls(ofp_event.EventOFPSwitchFeatures, CONFIG_DISPATCHER)
    def switch_features_handler(self, ev):
        dp = ev.msg.datapath
        self.total_packet_in = 1 + self.total_packet_in
        if dp.id in self.dp_packet_in:
          self.dp_packet_in[dp.id] = 1 + self.dp_packet_in[dp.id]
        else:
          self.dp_packet_in[dp.id] = 1
        

    @set_ev_cls(ofp_event.EventOFPPacketIn, MAIN_DISPATCHER)
    def _packet_in_handler(self, ev):
      dp = ev.msg.datapath
      self.total_packet_in = 1 + self.total_packet_in
      if dp.id in self.dp_packet_in:
        self.dp_packet_in[dp.id] = 1 + self.dp_packet_in[dp.id]
      else:
        self.dp_packet_in[dp.id] = 1
      print ('dpid: %d, %d total:' % (dp.id, self.dp_packet_in[dp.id], self.total_packet_in))
      
    def get_total_packet_in(self):
      return self.total_packet_in
      
    def get_dp_proportions(self, dp='all'):
      if dp == 'all':
        return self.dp_packet_in
      else:
        return self.dp_packet_in[dp]