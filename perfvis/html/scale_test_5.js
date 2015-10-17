var sample = {
  "switches": [
    {
      "ports": [
        {
          "hw_addr": "e9:42:0b:ed:3e:a1",
          "name": "s1-eth1",
          "port_no": "00000001",
          "dpid": "0000000000000001"
        },
        {
          "hw_addr": "45:2d:02:bd:56:54",
          "name": "s1-eth2",
          "port_no": "00000002",
          "dpid": "0000000000000001"
        }
      ],
      "dpid": "0000000000000001"
    },
    {
      "ports": [
        {
          "hw_addr": "0b:ad:20:b6:1d:96",
          "name": "s2-eth1",
          "port_no": "00000001",
          "dpid": "0000000000000002"
        },
        {
          "hw_addr": "be:1a:79:0f:43:cf",
          "name": "s2-eth2",
          "port_no": "00000002",
          "dpid": "0000000000000002"
        },
        {
          "hw_addr": "e4:84:d7:11:80:75",
          "name": "s2-eth3",
          "port_no": "00000003",
          "dpid": "0000000000000002"
        }
      ],
      "dpid": "0000000000000002"
    },
    {
      "ports": [
        {
          "hw_addr": "9c:fd:ac:62:72:9a",
          "name": "s3-eth1",
          "port_no": "00000001",
          "dpid": "0000000000000003"
        }
      ],
      "dpid": "0000000000000003"
    },
    {
      "ports": [
        {
          "hw_addr": "e6:41:3f:ff:88:c7",
          "name": "s4-eth1",
          "port_no": "00000001",
          "dpid": "0000000000000004"
        }
      ],
      "dpid": "0000000000000004"
    },
    {
      "ports": [
        {
          "hw_addr": "53:06:9a:e4:0a:70",
          "name": "s5-eth1",
          "port_no": "00000001",
          "dpid": "0000000000000005"
        }
      ],
      "dpid": "0000000000000005"
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
      },
      {
        "total_packet_in": 4,
        "dpid": "0000000000000003"
      },
      {
        "total_packet_in": 4,
        "dpid": "0000000000000004"
      },
      {
        "total_packet_in": 4,
        "dpid": "0000000000000005"
      }
    ],
    "up_time": 20,
    "packet_in_total": 80,
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
      },
      {
        "depart_rate": 101.1,
        "total_tx": 100,
        "rx_packets": 0,
        "total_rx": 100,
        "arrival_rate": 100.1,
        "tx_packets": 0,
        "uptime": 0,
        "port_no": "2"
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
      },
      {
        "depart_rate": 101.1,
        "total_tx": 100,
        "rx_packets": 0,
        "total_rx": 100,
        "arrival_rate": 100.1,
        "tx_packets": 0,
        "uptime": 0,
        "port_no": "2"
      },
      {
        "depart_rate": 101.1,
        "total_tx": 100,
        "rx_packets": 0,
        "total_rx": 100,
        "arrival_rate": 100.1,
        "tx_packets": 0,
        "uptime": 0,
        "port_no": "3"
      }
    ],
    "0000000000000003": [
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
    "0000000000000004": [
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
    "0000000000000005": [
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
        "hw_addr": "e9:42:0b:ed:3e:a1",
        "name": "s1-eth1",
        "port_no": "00000001",
        "dpid": "0000000000000001"
      },
      "dst": {
        "hw_addr": "0b:ad:20:b6:1d:96",
        "name": "s2-eth1",
        "port_no": "00000001",
        "dpid": "0000000000000002"
      }
    },
    {
      "src": {
        "hw_addr": "45:2d:02:bd:56:54",
        "name": "s1-eth2",
        "port_no": "00000002",
        "dpid": "0000000000000001"
      },
      "dst": {
        "hw_addr": "9c:fd:ac:62:72:9a",
        "name": "s3-eth1",
        "port_no": "00000001",
        "dpid": "0000000000000003"
      }
    },
    {
      "src": {
        "hw_addr": "0b:ad:20:b6:1d:96",
        "name": "s2-eth1",
        "port_no": "00000001",
        "dpid": "0000000000000002"
      },
      "dst": {
        "hw_addr": "e9:42:0b:ed:3e:a1",
        "name": "s1-eth1",
        "port_no": "00000001",
        "dpid": "0000000000000001"
      }
    },
    {
      "src": {
        "hw_addr": "be:1a:79:0f:43:cf",
        "name": "s2-eth2",
        "port_no": "00000002",
        "dpid": "0000000000000002"
      },
      "dst": {
        "hw_addr": "e6:41:3f:ff:88:c7",
        "name": "s4-eth1",
        "port_no": "00000001",
        "dpid": "0000000000000004"
      }
    },
    {
      "src": {
        "hw_addr": "e4:84:d7:11:80:75",
        "name": "s2-eth3",
        "port_no": "00000003",
        "dpid": "0000000000000002"
      },
      "dst": {
        "hw_addr": "53:06:9a:e4:0a:70",
        "name": "s5-eth1",
        "port_no": "00000001",
        "dpid": "0000000000000005"
      }
    },
    {
      "src": {
        "hw_addr": "9c:fd:ac:62:72:9a",
        "name": "s3-eth1",
        "port_no": "00000001",
        "dpid": "0000000000000003"
      },
      "dst": {
        "hw_addr": "45:2d:02:bd:56:54",
        "name": "s1-eth2",
        "port_no": "00000002",
        "dpid": "0000000000000001"
      }
    },
    {
      "src": {
        "hw_addr": "e6:41:3f:ff:88:c7",
        "name": "s4-eth1",
        "port_no": "00000001",
        "dpid": "0000000000000004"
      },
      "dst": {
        "hw_addr": "be:1a:79:0f:43:cf",
        "name": "s2-eth2",
        "port_no": "00000002",
        "dpid": "0000000000000002"
      }
    },
    {
      "src": {
        "hw_addr": "53:06:9a:e4:0a:70",
        "name": "s5-eth1",
        "port_no": "00000001",
        "dpid": "0000000000000005"
      },
      "dst": {
        "hw_addr": "e4:84:d7:11:80:75",
        "name": "s2-eth3",
        "port_no": "00000003",
        "dpid": "0000000000000002"
      }
    }
  ]
}
