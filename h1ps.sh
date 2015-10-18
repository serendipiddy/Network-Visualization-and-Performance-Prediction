# Usage: h1ps.sh <agree_dst> <times_to_create> <ping_duration>
DEST=$1
COUNT=$2
SLP=$3

echo 'Sleeping 70s'
sleep 70
COUNTER=0
while [ $COUNTER -lt $COUNT ]; do
  nping $DEST --rate=100 -c0 -NH --udp >/dev/null 2>&1 &
  npingpid=$(ps | grep nping | tail -n1 | awk '{print $1;}')
  echo 'Pinging on PID '$npingpid' for '$SLP's'
  sleep $SLP
  echo 'killed process '$npingpid' waiting 10s'
  kill $npingpid >/dev/null 2>&1
  sleep 10
  let COUNTER+=1
done
echo 'Completed '$COUNT' pings to '$DEST' '

