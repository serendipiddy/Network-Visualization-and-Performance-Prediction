## Start TCPDump for eth1 and eth2 of switch 1 to monitor traffic across this path

# SIZES=( 10 60 200 600 1000 1400 1460 )
SIZES=( 600 1000 1400 1460 )

for i in '${SIZES[@]}'
  tcpdump -c201 -i s1-eth1 --time-stamp-precision=nano -nn > ~test.dump &
  tcpdump -c201 -i s1-eth2 --time-stamp-precision=nano -nn > ~test.dump
  sleep 1
done 

echo 'complete'