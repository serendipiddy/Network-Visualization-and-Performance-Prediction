import sys, getopt, random, simplejson as json, copy, binascii

existing_macs = list()
debug = False

def generate_mac():
  new_mac = list()
  
  while (not new_mac) or (new_mac in existing_macs):
    new_mac = list()
    for i in range(6):
      a = bytearray(random.getrandbits(8) for i in range(1))
      new_mac.append(binascii.b2a_hex(a))
    
    new_mac = ':'.join(new_mac)
  
  return new_mac

class Switch:
  def __init__(self,dpid):
    self.dpid = "%0.16d" % dpid
    self.port_count = 0
    self.ports = list()
    self.links = list()
    if (debug): print ('    new Switch %s' % dpid)
    
  def addPort(self):
    self.port_count += 1
    id = '%0.8d' % self.port_count
    p = Port(id,self.dpid)
    self.ports.append(p)
    if (debug): print ('      adding port_no:%s on dpid:%s' % (self.port_count,self.dpid.replace('0','')))
    return p
    
  def connectTo(self, switch):
    port1 = self.addPort()
    port2 = switch.addPort()
    link = Link(port1, port2)
    self.links.append(link)
    switch.links.append(link)
    
  def __str__(self):
    return self.dpid
    
class Port:
  def __init__(self, id, dpid):
    self.port_no = id
    self.dpid = dpid
    self.name = 's%s-eth%s' % (dpid.replace('0',''), id.replace('0',''))
    self.mac = generate_mac()
    if (debug): print ('    new Port %s' % self.name)
    
class Link:
  def __init__(self,port1,port2):
    self.port1 = port1
    self.port2 = port2
    self.write_count = 0
    if (debug): print ('    new Link (%s, %s)' % (self.port1.name, self.port2.name))
    
  def getOther(self, switch):
    if (self.port1.dpid == switch.dpid):
      return self.port2.dpid
    elif (self.port2.dpid == switch.dpid):
      return self.port1.dpid
    else:
      return '    switch %s not on link' % switch.dpid
      
  def getSrcPort(self, switch):
    if (self.port1.dpid == switch):
      return self.port1
    elif (self.port2.dpid == switch):
      return self.port2
    else:
      return '    switch %s not on link' % switch
  
  def getDstPort(self, switch):
    if (self.port1.dpid == switch):
      return self.port2
    elif (self.port2.dpid == switch):
      return self.port1
    else:
      return '    switch %s not on link' % switch
  
def build_tree(nodes, breadth):
  '''Builds a tree from the list of nodes given. Each node 
    has 'breadth' children, until nodes run out'''
  next_peer = copy.copy(nodes)
  next_peer.pop(0) # remove root
  
  if (debug): print('\n=== Building a tree topology ===')
  for parent in nodes:   # step through nodes
    if (debug): print('current node %s' % parent.dpid)
    for i in range(breadth):
      if (next_peer):
        child = next_peer.pop(0) # peer with next unpaired node
        if (debug): print('  current child %s' % child.dpid)
        parent.connectTo(child)
      else:
        if (debug): print('  no more nodes')
        return

def build_linear(nodes):
  '''Builds a line of switches'''
  next_peer = copy.copy(nodes)
  current = next_peer.pop(0) # remove root
  
  if (debug): print('\n=== Building a linear topology ===')
  while next_peer:
    if (debug): print('current node %s' % current.dpid)
    current.connectTo(next_peer[0])
    current = next_peer.pop(0) # remove root
  
  if (debug): print ('  no more nodes')
  return
        
def getData(switches):
  s_dict = dict()
  for s in switches:
    dpid = s.dpid
    ports = list()
    for p in s.ports:
      ports.append({'port_no':p.port_no.replace('0',''),"rx_packets": 0, "tx_packets": 0, "arrival_rate": 100.1, "depart_rate": 101.1, "total_tx": 100, "total_rx": 100, "uptime": 0})
    s_dict[dpid] = ports
  return s_dict
  
def getController(switches):
  sws = list()
  num_ports = 0
  for s in switches:
    sws.append({'dpid':s.dpid, 'total_packet_in':4})
    num_ports += len(s.ports)
  return { "packet_in_delta":3, "packet_in_total":num_ports*10, "duration":1, "up_time":20, "switches":sws }
  
def getSws(switches):
  s_list = list()
  for s in switches:
    dpid = s.dpid
    ports = list()
    for p in s.ports:
       ports.append({"hw_addr": p.mac, "name": p.name, "port_no": p.port_no, "dpid": p.dpid})
    s_list.append({'dpid':dpid, 'ports': ports})
  return s_list
  
def getLinks(switches):
  all_links = list()
  for s in switches:
    for l in s.links:
      src = l.getSrcPort(s.dpid)
      dst = l.getDstPort(s.dpid)
      all_links.append({ "src": {"hw_addr": src.mac, "name": src.name, "port_no": src.port_no, "dpid": src.dpid}, "dst": {"hw_addr": dst.mac, "name": dst.name, "port_no": dst.port_no, "dpid": dst.dpid}})
  return all_links
  
def main(argv):
  
  # help = 'generate_offline_topology.py -n <num_nodes> -s <num_children_per_node>' -t <topology>
  try:
    opts, args = getopt.getopt(argv,"ht:n:s:",[]) # pulls out the specified options, ":" means followed by an argument
  except getopt.GetoptError:
    print help
    sys.exit(2)
    
  nodes = 3
  type = 'tree' # type = 'linear'
  split = 2
    
  for opt, arg in opts:
    if opt == '-h':
      print help
      sys.exit()
    elif opt == '-n': # opt in ("-i","--ifile"):
      nodes = int(arg)
    elif opt == '-t':
      type = arg
    elif opt == '-s':
      split = int(arg)
    else:
      print help
      sys.exit()
  
  
  filename = '%s_%s_%s.txt' % (type,nodes,split)
  
  switches = list()
  
  dpid = 0
  for i in range(nodes):
    dpid += 1
    switches.append(Switch(dpid))
  
  if (type == 'tree'):
    build_tree(switches, split)
  elif (type == 'linear'):
    build_linear(switches)
    filename = '%s_%s.txt' % (type,nodes)
  
  print ('')
  for s in switches:
    print('dpid:%s ports:%d' % (s.dpid,len(s.ports)))
    for p in s.ports:
      print('  port:%s mac:%s' % (p.name, p.mac))
    for l in s.links:
      print('  linkTo:%s' % (l.getOther(s)))
  
  
  try:
      fd = open(filename,'a')
  except IOError:
    print('cannot open %s' % filename)
    sys.exit(2)
  
  # out.write(json.dumps(s_dict, indent=2 * ' '))
  data = getData(switches)
  controller = getController(switches)
  sws = getSws(switches)
  links = getLinks(switches)
  
  out = {'data':data,'controller': controller, 'switches':sws, 'links':links}
  
  fd.write('var scale_test_%s = ' % filename[0:-4])
  fd.write(json.dumps(out, indent=2 * ' '))
  print('\noutput to: %s' % filename[0:-4])
  
  fd.close()



if __name__ == "__main__":
  main(sys.argv[1:])