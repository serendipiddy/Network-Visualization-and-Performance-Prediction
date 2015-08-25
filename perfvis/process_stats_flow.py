from ryu.lib.dpid import dpid_to_str
from operator import attrgetter
from ryu.ofproto import ofproto_v1_3
from ryu.ofproto.ofproto_v1_3_parser import OFPInstructionActions
import hashlib

""" Functions for processing the performance visualizer app """

def invert(flow_array, placeholder):
    """ Transforms an array of flows into a dictionary, referenced by flow match """
    if flow_array == placeholder:
      return flow_array 
    prev = {}
    for p in flow_array:
      prev[p['flow_id']] = p
      
    return prev
    
def stats_event(ev, logging):
    """ Reads the OpenFlow event, translating into a dictionary.
        { datapath: dpid,
          flows: [  { flow_id
                      table_id
                      packet_count
                      duration_sec
                      duration_nano
                      match          } ] } """
    body = ev.msg.body
    
    # make a dictionary
    data = {
        'datapath': dpid_to_str(ev.msg.datapath.id),
        'flows': []
    }
    
    # draw header row
    if (logging):
      print('Datapath %016x:\n%8s %8s %8s %8s %8s' 
                  % (ev.msg.datapath.id,'table_id','packets','sec','nano','match'))
    
    # add each flow's statistic
    for stat in body:
        hash = hashlib.md5()
        hash.update("%d %s" % (stat.table_id, stat.match))
        flow = {
            'flow_id':        hash.hexdigest(),
            'table_id':       stat.table_id,
            'packet_count':   stat.packet_count, 
            'duration_sec':   stat.duration_sec,
            'duration_nano':  stat.duration_nsec,
            'match':          stat.match,
            'action':         stat.instructions
          }
        # parse_instructions(stat.instructions)
        # data['flows'].append(flow)
        data['flows'].append(flow)
        
        if (logging):
            print('%8s %8d %8d %9d %8s' %
                    (stat.table_id, stat.packet_count, 
                    stat.duration_sec, stat.duration_nsec, stat.match))
    return data
    
def avg_rates(current, previous, placeholder):
    """ Calculates the current average packet rates for this switch """
    dp_stats = []
    
    previous = invert(previous, placeholder)
    
    # checked if not in previous below
    #   if not in current it would simply disappear..
    
    # division by zero can occur otw /duration
    
    for p in current['flows']: # for each flow in dp
        flow_id = p['flow_id']
        flow_stats = {'flow_id':flow_id}
        
        ## TODO: detect previous results on a per-flow basis.
        
        # find the difference between current and packet counts, calculate the averages
        if (previous == placeholder or flow_id not in previous):
            duration = p['duration_sec']
            if (duration <= 0):
              flow_stats['arrival_rate'] = 0
            else:
              flow_stats['arrival_rate'] = float(p['packet_count'])/duration
            flow_stats['packet_count'] = p['packet_count']
        else:
            prev_data = previous[flow_id]
            duration = p['duration_sec'] - prev_data['duration_sec']
            flow_stats['arrival_rate'] = float(p['packet_count'] - prev_data['packet_count'])/duration
            flow_stats['packet_count'] = p['packet_count'] - prev_data['packet_count']

        flow_stats['total_packets'] = p['packet_count']
        
        dp_stats.append(flow_stats)
    
    return dp_stats
    
def parse_instructions(instrs):
    destination = -1
    print(instrs)
    for a in instrs:
      print(a)
      OFPInstructionActions
      # print(a['OFPActionOutput'])
      print(p)
      
    
    return destination
    
    # enum ofp_port_no
    # ofproto_v1_3.OFPP_MAX = 0xffffff00
    # ofproto_v1_3.OFPP_IN_PORT = 0xfffffff8       # Send the packet out the input port. (only way to go back
    # ofproto_v1_3.OFPP_TABLE = 0xfffffff9         # Perform actions in flow table. NB: This can only be the destination port for packet-out messages.
    # ofproto_v1_3.OFPP_NORMAL = 0xfffffffa        # Process with normal L2/L3 switching.
    # ofproto_v1_3.OFPP_FLOOD = 0xfffffffb         # All physical ports except input port and those disabled by STP.
    # ofproto_v1_3.OFPP_ALL = 0xfffffffc           # All physical ports except input port.
    # ofproto_v1_3.OFPP_CONTROLLER = 0xfffffffd    # Send to controller.
    # ofproto_v1_3.OFPP_LOCAL = 0xfffffffe         # Local openflow "port".
    # ofproto_v1_3.OFPP_ANY = 0xffffffff           # Not associated with a physical port.