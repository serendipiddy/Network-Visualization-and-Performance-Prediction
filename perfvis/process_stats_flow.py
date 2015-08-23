from ryu.lib.dpid import dpid_to_str
from operator import attrgetter
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
    
    # add each port's statistic
    for stat in body:
        hash = hashlib.md5()
        hash.update("%d %s" % (stat.table_id, stat.match))
        flow = {
            'flow_id':        hash.hexdigest(),
            'table_id':       stat.table_id,
            'packet_count':   stat.packet_count, 
            'duration_sec':   stat.duration_sec,
            'duration_nano':  stat.duration_nsec,
            'match':          stat.match
          }
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
    
    # # # # # # # # # # # # # # # # # # # # # # # # #
    #                                               #
    #  some check in case match is not in previous  #
    #       (and previous is not is current)        #
    #                                               #
    # # # # # # # # # # # # # # # # # # # # # # # # #
    
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

        # flow_stats['service_rate'] = 56625 ## TODO
        flow_stats['total_packets'] = p['packet_count']
        
        dp_stats.append(flow_stats)
    
    return dp_stats