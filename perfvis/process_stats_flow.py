from ryu.lib.dpid import dpid_to_str
from operator import attrgetter
import json

""" Functions for processing the performance visualizer app """

def invert(flow_array, placeholder):
    """ Transforms an array of flows into a dictionary, referenced by flow match """
    if flow_array == placeholder:
      return flow_array 
    prev = {}
    for p in flow_array:
      prev[p['match']] = p
      
    return prev
    
def stats_event(ev, logging):
    """ Reads the OpenFlow event, translating into a dictionary.
        { datapath: dpid,
          flows: [  { table_id
                      packet_count
                      duration_sec
                      duration_nano
                      match          } ] } """
    body = ev.msg.body
    
    # make a dictionary
    data = {
        'datapath': dpid_to_str(ev.msg.datapath.id),
        'flows': dict()
    }
    
    # draw header row
    if (logging):
      print('Datapath %016x:\n%8s %8s %8s %8s %8s' 
                  % (ev.msg.datapath.id,'table_id','packets','sec','nano','match'))
    
    # add each port's statistic
    for stat in body:
        flow = {
            'table_id': stat.table_id,
            'packet_count': stat.packet_count, 
            'duration_sec': stat.duration_sec,
            'duration_nano': stat.duration_nsec,
            'match': stat.match
          }
        # data['flows'].append(flow)
        data['flows'][str(stat.match)[9:-1]] = flow
        
        if (logging):
            print('%8s %8d %8d %9d %8s' %
                    (stat.table_id, stat.packet_count, 
                    stat.duration_sec, stat.duration_nsec, stat.match))
    return data
    
def avg_rates(current, previous, placeholder):
    """ Calculates the current average packet rates for this switch """
    dp_stats = []
    
    previous = invert(previous, placeholder)
    
    # some check in case match is not in previous
    
    for p in current['flows']: # for each flow in dp
        # flow_match = p['match']
        # print(json.dumps(str(flow_match)[9:-1]))
        flow_match = p['match'][9:-1]
        flow_stats = {'match':flow_match}
        
        # { datapath: dpid,
          # flows: [  { table_id
                      # packet_count
                      # duration_sec
                      # duration_nano
                      # match          } ] }
        
        # find the difference between current and old stats
        if (previous == placeholder):
            duration = p['duration_sec']
            flow_stats['arrival_rate'] = float(p['packet_count'])/duration
        
        else:
            prev_data = previous[flow_match]
            duration = p['duration_sec'] - prev_data['duration_sec']
            flow_stats['arrival_rate'] = float(p['packet_count'] - prev_data['packet_count'])/duration

        flow_stats['service_rate'] = 56625 ## TODO
        flow_stats['total_packets'] = p['packet_count']
        
        dp_stats.append(flow_stats)
    
    return dp_stats