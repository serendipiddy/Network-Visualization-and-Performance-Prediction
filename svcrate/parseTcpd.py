import sys, getopt, re
from itertools import izip  # http://stackoverflow.com/a/3322448

'''
Want the raw data, but not the original files. Assumes each file has one run.
'''

def main(argv):
  ## http://www.tutorialspoint.com/python/python_command_line_arguments.htm
  file1 = ''
  file2 = ''
  try:
    opts, args = getopt.getopt(argv,"hi:j:s:",[]) # pulls out the specified options, ":" means followed by an argument
  except getopt.GetoptError:
    print 'parseTcpd.py -i <inputfile1> -j <inputfile2>'
    sys.exit(2)
  
  for opt, arg in opts:
    if opt == '-h':
      print 'parseTcpd.py -i <inputfile1> -j <inputfile2>'
      sys.exit()
    elif opt == '-i': # opt in ("-i","--ifile"):
      file1 = arg
    elif opt == '-j':
      file2 = arg
    elif opt == '-s':
      sanity_check(arg)
      sys.exit()
    else:
      print 'parseTcpd.py -i <inputfile1> -j <inputfile2>'
      sys.exit()
      
  
  ## Read the file, checking it exists
  try:
    f1 = open(file1,'r')
    f2 = open(file2,'r')
  except IOError:
    print('cannot open %s' % file1)
    sys.exit(2)
    
  filecount = 0
  o = open(('out_%02d-%s' % (filecount,file1)),'a') # files change when udp packets are encountered
  print('output to %s' % ('out_%02d-%s' % (filecount,file1)))
  
  ## http://stackoverflow.com/a/6475335, use an iterator
  linecount = 0
  o.write('nano1 nano2 delta\n')
  for line1, line2 in izip(f1,f2): ## Assumes files are same length. Good.
    newfile = process(line1,line2,o)
    if newfile:
      filecount += 1
      o.close()
      o = open(('out_%02d-%s' % (filecount,file1)),'a')
      o.write('nano1 nano2 delta\n')
      print('new file %s' % ('out_%02d-%s' % (filecount,file1)))

    linecount += 1
  
  f1.close()
  f2.close()
  o.close()
  print("%d lines processed" % linecount)

def sanity_check(output_file):
  f = open(output_file,'r')
  count = 0
  prev = (0,0)
  errors = 0
  for line in f:
    ln = line.split()
    if (ln[0] == 'nano1'):
      continue
    if (int(ln[0]) - int(prev[1]) < 0):
      print ('Whoops! Line %d has a t1 before the previous t2, on line:' % count)
      errors += 1
    count  += 1
  f.close()
  print('Finished, %d errors found, %d lines processed' % (errors,count))

def process(line1,line2,out):
  '''Assumes the time in line2 is AFTER line1 for midnight corrections'''
  l1 = line1.split(' ')
  l2 = line2.split(' ')
  
  if (len(l1) < 2):
    print("empty line")
    return False
  
  t1 = re.findall(r'[\d]+',l1[0])
  t2 = re.findall(r'[\d]+',l2[0])
  
  ns1 = int(t1[3])
  ns2 = int(t2[3])
  # print(ns1,ns2)
  delta = ns2 - ns1
  if delta < 0:
    delta += 1000000000 # deal with overflows, add one second
  
  dst = l1[4].split('.')[4]
  if dst == '80:':  # is TCP traffic from nping
    out.write(("%d %d %d\n" % (ns1,ns2,delta)))
    return False
  
  return True
  
if __name__ == "__main__":
  main(sys.argv[1:])