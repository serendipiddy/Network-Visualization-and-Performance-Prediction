from ryu.lib.dpid import dpid_to_str
from operator import attrgetter
from ryu.ofproto import ofproto_v1_3

""" Functions for processing the performance visualizer app """

def invert(port_array, placeholder):
    """ Transforms an array of ports into a dictionary, referenced by port number """
    if port_array == placeholder:
      return port_array 
    prev = {}
    for p in port_array:
      prev[p['port_no']] = p
      
    return prev
    
def stats_event(ev, logging):
    """ Reads the OpenFlow event, translating into a dictionary.
        { datapath: dpid,
          ports: [  { port_no
                      rx_packets
                      tx_packets
                      rx_dropped
                      tx_dropped
                      duration_sec
                      duration_nano  } ] } """
    body = ev.msg.body
    
    # make a dictionary
    data = {
        'datapath': dpid_to_str(ev.msg.datapath.id),
        'ports': []
    }
    
    # draw header row
    if (logging):
      print('Datapath %016x:\n%10s %8s %8s %8s %8s %8s %8s' 
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
        
        if (logging):
          print('%10s %8d %8d %8d %8d %8d %9d' % (
                            parse_port_number(stat.port_no),
                            stat.rx_packets, stat.tx_packets,
                            stat.rx_dropped, stat.tx_dropped,
                            stat.duration_sec, stat.duration_nsec))
    return data
    
def parse_port_number(port_num):
    return {
      ofproto_v1_3.OFPP_MAX        : "MAX",
      ofproto_v1_3.OFPP_IN_PORT    : "IN_PORT",
      ofproto_v1_3.OFPP_TABLE      : "TABLE",
      ofproto_v1_3.OFPP_NORMAL     : "NORMAL",
      ofproto_v1_3.OFPP_FLOOD      : "FLOOD",
      ofproto_v1_3.OFPP_ALL        : "ALL",
      ofproto_v1_3.OFPP_CONTROLLER : "CONTROLLER",
      ofproto_v1_3.OFPP_LOCAL      : "LOCAL",
      ofproto_v1_3.OFPP_ANY        : "ANY"
    }.get(port_num, port_num)

def avg_rates(current, previous, placeholder):
    """ Calculates the current average rates for this switch """
    dp_stats = []
    
    previous = invert(previous, placeholder)
    
    for p in current['ports']: # for each port in dp
        port_no = p['port_no']
        port_stats = {'port_no':port_no}
        
        # find the difference between current and old stats
        if (previous == placeholder):
            duration = p['duration_sec']
            if (duration <= 0):
              port_stats['arrival_rate'] = 0
              port_stats['depart_rate']  = 0
            else:
              port_stats['arrival_rate'] = float(p['rx_packets'])/duration
              port_stats['depart_rate']  = float(p['tx_packets'])/duration
            port_stats['rx_packets'] = p['rx_packets']
            port_stats['tx_packets'] = p['tx_packets']
        else:
            prev_data = previous[port_no]
            duration = p['duration_sec'] - prev_data['duration_sec']
            port_stats['rx_packets']   = p['rx_packets'] - prev_data['rx_packets']
            port_stats['arrival_rate'] = float(port_stats['rx_packets'])/duration
            port_stats['tx_packets']   = p['tx_packets'] - prev_data['tx_packets']
            port_stats['depart_rate']  = float(port_stats['tx_packets'])/duration
        
        port_stats['total_rx'] = p['rx_packets']
        port_stats['total_tx'] = p['tx_packets']
        
        dp_stats.append(port_stats)
    
    return dp_stats