#Service Rate Experiment

## Aim
To measure the average service rate of a switch for use in queueing models describing behaviour of OpenFlow switches.

## Requirements
To run this experiment certain 
* The OpenFlow switch to be measured
* Two Ethernet network hosts, source and sink
* Ability to install flows on switch and sudo access to hosts.

This experiment details the case where the switch is an OpenVSwitch emulated device within a VM.

## Method
### Setting up
The hosts must be set up so that traffic sent can be immediately transmitted and not interrupted by ARP table timeouts. To maintain traffic in a single direction, all traffic at the sink is dropped.

The source host must establish a static ARP rule for the sink:
```
$ arp -i h1-eth0 -s 10.0.0.2 00:00:00:00:00:02
```
Where h1-eth0 is the port connected to the switch, and 10.0.0.2 and 00:00:00:00:00:02 are the IPv4 and MAC addresses of the sink, respectively.

The sink must drop all traffic from the source host:
```
route add -host 10.0.0.1 reject
```
Where 10.0.0.1 is the IPv4 address of the sink.

Finally, a TCPdump session must be started for the ingress and egress ports on the switch.
sudo ../tcpd -i s1-eth1 --time-stamp-precision=nano > ~/s1-eth1.svc.dump &
sudo ../tcpd -i s1-eth2 --time-stamp-precision=nano > ~/s1-eth2.svc.dump &

### Running the experiment
Nping, from nmap, is used to generate traffic from source to sink. It is run on the source host for a range of packet payloads.
Example:
```
nping 10.0.0.2 --tcp --rate 100 --data-length 10 -c2000000 -NH
```
Which generates 2 million packets TCP taffic, at a rate of 100 packets/second, of payload size 10 bytes. The -HN switch hides output and prevents responding to any replies.
While faster rates are available, 100 packets/second staggers the flow so a maximum of one packet is being processed at any instance.

The range of packet size used are: {10,60,200,600,1000,1400,1460}. A size of 1460 bytes is the maximum payload available without fragmenting packets.
Between each run of the command at a data-length, a ten UDP packets are is sent, and a slower rate. The size of this packet changes with each run to assist with differentiating runs. Sending at a rate of 1/second allows a ten second gap between runs.
```
nping 10.0.0.2 --udp --rate 1 --data-length 101 -c1
```
### Processing results
Finding the difference the output from TCPdump on each switch interface, 
* Quick (python?) script to do that, assuming no packets were dropped at either interface.

## Results
The general pattern should be that service rate increases with packet size, due to propagation and processing delays within the switch.

## Discussion
To maintain a single packet being processed, and thus no queueing in the switch, a test in done before hand, with a similar setup, where bursts of packets are send at increasing rates until the time that a packet leaves is after the time the next packet is sent. 100 per second is used as a safe value for any switch.

Should packets be allowed to queue, the delay from calculating the difference between ingress and egress time will include not only processing but also queueing delays.

### Limitations
For greater precision nanosecond precision is used here. However, only later versions of TCPdump include this feature, and some hardware cannot support this. The default microsecond precision should suffice.

The behaviour of TCP and UDP differs in SDN. For TCP flows only the first packet is sent to the controller for processing before the flow begins, while all UDP packets are sent until a flow is installed. The models being run with the results of this experiment are designed for TCP traffic in an SDN network and thus TCP is selected. There is no reason other protocols, like UDP, could not be measured and compared.

While the nature of a TCP flow is one of responses, the aim is of this experiment to find the average rate a switch can process a single TCP packet type, not a TCP flow. This is required by queueing models. So despite being un-tcp-like behaviour the result fits the intention of the data.

## Hardware-based version
* placement of port probe
