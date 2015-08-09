from ryu.lib.dpid import dpid_to_str
from operator import attrgetter

# class process_stats():


""" Transforms an array of ports into a dictionary, referenced by port number """
def invert(port_array, placeholder):
    if port_array == placeholder:
      return port_array 
    prev = {}
    for p in port_array:
      prev[p['port_no']] = p
      
    return prev
    
""" Reads the OpenFlow event, translating into a dictionary.
    { datapath: dpid,
      ports: [  { port_no
                  rx_packets
                  tx_packets
                  rx_dropped
                  tx_dropped
                  duration_sec
                  duration_nano  } ] } """
def stats_event(ev, logging):
    body = ev.msg.body
    
    # make a dictionary
    data = {
        'datapath': dpid_to_str(ev.msg.datapath.id),
        'ports': []
    }
    
    # draw header row
    if (logging):
      print('Datapath %016x:\n%8s %8s %8s %8s %8s %8s %8s' 
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
          print('%8x %8d %8d %8d %8d %8d %8d' % (
                            stat.port_no,
                            stat.rx_packets, stat.tx_packets,
                            stat.rx_dropped, stat.tx_dropped,
                            stat.duration_sec, stat.duration_nsec))
    
    return data
    
""" Calculates the current average rates for this switch """
def avg_rates(current, previous, placeholder):
    dp_stats = []
    
    previous = invert(previous, placeholder)
    
    for p in current['ports']: # for each port in dp
        port_no = p['port_no']
        port_stats = {'port_no':port_no}
        
        # find the difference between current and old stats
        if (previous == placeholder):
            duration = p['duration_sec']
            port_stats['arrival_rate'] = float(p['rx_packets'])/duration
            port_stats['depart_rate'] = float(p['tx_packets'])/duration
            port_stats['tx_packets'] = p['tx_packets']
            port_stats['rx_packets'] = p['rx_packets']
        
        else:
            prev_data = previous[port_no]
            duration = p['duration_sec'] - prev_data['duration_sec']
            port_stats['arrival_rate'] = float(p['rx_packets'] - prev_data['rx_packets'])/duration
            port_stats['depart_rate'] = float(p['tx_packets'] - prev_data['tx_packets'])/duration
            port_stats['tx_packets'] = p['tx_packets'] - prev_data['tx_packets']
            port_stats['rx_packets'] = p['rx_packets'] - prev_data['rx_packets']

        
        dp_stats.append(port_stats)
    
    return dp_stats