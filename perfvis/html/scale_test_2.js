var sample = {
  "switches": [
    {
      "ports": [
        {
          "hw_addr": "63:ff:f8:d2:ee:a5",
          "name": "s1-eth1",
          "port_no": "00000001",
          "dpid": "0000000000000001"
        }
      ],
      "dpid": "0000000000000001"
    },
    {
      "ports": [
        {
          "hw_addr": "7d:e7:01:97:aa:f5",
          "name": "s2-eth1",
          "port_no": "00000001",
          "dpid": "0000000000000002"
        }
      ],
      "dpid": "0000000000000002"
    }
  ],
  "controller": {
    "duration": 1,
    "switches": [
      {
        "total_packet_in": 4,
        "dpid": "0000000000000001"
      },
      {
        "total_packet_in": 4,
        "dpid": "0000000000000002"
      }
    ],
    "up_time": 20,
    "packet_in_total": 20,
    "packet_in_delta": 3
  },
  "data": {
    "0000000000000001": [
      {
        "depart_rate": 101.1,
        "total_tx": 100,
        "rx_packets": 0,
        "total_rx": 100,
        "arrival_rate": 100.1,
        "tx_packets": 0,
        "uptime": 0,
        "port_no": "1"
      }
    ],
    "0000000000000002": [
      {
        "depart_rate": 101.1,
        "total_tx": 100,
        "rx_packets": 0,
        "total_rx": 100,
        "arrival_rate": 100.1,
        "tx_packets": 0,
        "uptime": 0,
        "port_no": "1"
      }
    ]
  },
  "links": [
    {
      "src": {
        "hw_addr": "63:ff:f8:d2:ee:a5",
        "name": "s1-eth1",
        "port_no": "00000001",
        "dpid": "0000000000000001"
      },
      "dst": {
        "hw_addr": "7d:e7:01:97:aa:f5",
        "name": "s2-eth1",
        "port_no": "00000001",
        "dpid": "0000000000000002"
      }
    },
    {
      "src": {
        "hw_addr": "7d:e7:01:97:aa:f5",
        "name": "s2-eth1",
        "port_no": "00000001",
        "dpid": "0000000000000002"
      },
      "dst": {
        "hw_addr": "63:ff:f8:d2:ee:a5",
        "name": "s1-eth1",
        "port_no": "00000001",
        "dpid": "0000000000000001"
      }
    }
  ]
}
