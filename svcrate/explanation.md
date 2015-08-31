#Service Rate Experiment

## Aim
To ascertain the average service rate of a switch for use in queueing models describing behaviour of OpenFlow switches.

## Requirements
To run this experiment certain 
* The OpenFlow switch to be measured
* Two Ethernet network hosts, source and sink
* Ability to install flows on switch and sudo access to hosts.

This experiment details the case where the switch is an OpenVSwitch emulated device within a VM.

## Setting up
The hosts must be set up so that traffic sent can be immediately transmitted and not interrupted by ARP table timeouts. To maintain traffic in a single direction, all traffic at the sink is dropped.

The source host must establish a static ARP rule for the sink:
'''
$ arp -i h1-eth0 -s 10.0.0.2 00:00:00:00:00:02
'''
Where h1-eth0 is the port connected to the switch, and 10.0.0.2 and 00:00:00:00:00:02 are the IPv4 and MAC addresses of the sink, respectively.

The sink must drop all traffic from the source host:
'''
route add -host 10.0.0.1 reject
'''
Where 10.0.0.1 is the IPv4 address of the sink.

Finally, a TCPdump session must be started for the ingress and egress ports on the switch.
sudo ../tcpd -i s1-eth1 --time-stamp-precision=nano > ~/s1-eth1.svc.dump &
sudo ../tcpd -i s1-eth2 --time-stamp-precision=nano > ~/s1-eth2.svc.dump &

## Running the experiment
* sending rate, so only one is in the switch at a time
* 2 million packets
* range of packet sizes
* breaking up packet sizes with other traffic

## Results
* The dumps from each, finding the difference
* Quick (python? script to do that, assuming no packets were dropped at either interface.

## Discussion
### Limitations
* precision, importance?

## Hardware-based version
* placement of port probe
