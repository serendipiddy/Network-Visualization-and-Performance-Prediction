function testModel(verbose) {
    var test_mm1 = {
      lam: [100.0, 200.0, 200.0, 0.1, 100.0, -10.0, 10.0],
      mu:  [200.0, 100.0, 200.0, 100.0,  0.1, 10.0, -10.0],
      rho: [5e-01, 2e+00, 1e+00, 1e-03, 1e+03, -1e+00, -1e+00],
      soj: [0.01000000, -0.01000000, Number.POSITIVE_INFINITY, 0.01001001001001001, -0.01001001001001001, 0.05000000, -0.05000000],
      len: [1.000000000, -2.000000000, Number.POSITIVE_INFINITY, 0.001001001001001001, -1.001001001001001001, -0.500000000, -0.500000000]
    };
    var test_mm1k = {
      lam: [100.0, 200.0, 200.0, 0.1, 100.0, -10.0, 10.0],
      mu:  [200.0, 100.0, 200.0, 100.0, 0.1, 10.0, -10.0],
      rho: [5e-01, 2e+00, 1e+00, 1e-03, 1e+03, -1e+00, -1e+00],
      k:   [0,1,2,25,50,128,512],
      soj: {
        k0:    [NaN, NaN, NaN, NaN, NaN, NaN, NaN],
        k1:    [5e-03, 1e-02, NaN, 1e-02, 10, NaN, NaN],
        k2:    [0.006666667, 0.016666667, NaN, 0.010009990, 19.990009990, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY],
        k25:   [9.999996e-03, 2.400000e-01, NaN, 1.001001e-02, 2.499900e+02, NaN, NaN],
        k50:   [0.01000000, 0.49000000, NaN, 0.01001001, 499.98998999, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY],
        k128:  [0.01000000, 1.27000000, NaN, 0.01001001, NaN, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY],
        k512:  [0.01000000,  5.11000000, NaN, 0.01001001, NaN, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY],
      },
      len: {
        k0:    [0, 0, NaN, 0, 0, 0, 0],
        k1:    [0.333333333, 0.666666667, NaN, 0.000999001, 0.999000999, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY],
        k2:    [0.571428571, 1.428571429, NaN, 0.001000998, 1.998999002, 1.000000000, 1.000000000],
        k25:   [0.999999613, 24.000000387, NaN, 0.001001001, 24.998998999, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY],
        k50:   [1.000000000, 49.000000000, NaN, 0.001001001, 49.998998999, 25.000000000, 25.000000000],
        k128:  [1.000000e+00, 1.270000e+02, NaN, 1.001001e-03, NaN, 6.400000e+01, 6.400000e+01],
        k512:  [1.000000e+00, 5.110000e+02, NaN, 1.001001e-03, NaN, 2.560000e+02, 2.560000e+02],
      }
    }
    
    /* test mm1 */
    console.log('=== TEST M/M/1 ===');
    var numTests = 0;
    var numPass  = 0;
    for (var i = 0; i < test_mm1.lam.length; i++) {
        /* Compute model result */
        var model_in = {
            'arrival_rate': test_mm1.lam[i],
            'service_rate': test_mm1.mu[i]
        }
        model_out = model.compute('mm1_basic',model_in);
        
        /* Compare result output */
        var pass = true;
        var result = '';
        if (model_out.load != test_mm1.rho[i])    {
            pass = false; 
            result = result+('\n       rho: '+model_out.load+   " "+test_mm1.rho[i]);
        }
        if (model_out.length != test_mm1.len[i])  {
            pass = false; 
            result = result+('\n       len: '+model_out.length+ " "+test_mm1.len[i]);
        }
        if (model_out.sojourn != test_mm1.soj[i]) {
            pass = false; 
            result = result+('\n       soj: '+model_out.sojourn+" "+test_mm1.soj[i]);
        }
        if (verbose) {
          console.log('   '+(pass ? 'PASS':'FAIL')
                +' lam:'+test_mm1.lam[i]
                +' mu:' +test_mm1.mu[i]
                +result);
        }
        numTests++;
        if (pass) numPass++;
    }
    console.log('== PASS '+numPass+'/'+numTests+' ===');
    
    /* test mm1k */
    console.log('=== TEST M/M/1/K ===');
    var numTests = 0;
    var numPass  = 0;
    for (var i = 0; i < test_mm1k.lam.length; i++) {
      for (var j = 0; j < test_mm1k.k.length; j++) {
        /* Compute model result */
        var model_in = {
            'arrival_rate': test_mm1k.lam[i],
            'service_rate': test_mm1k.mu[i],
            'queue_capacity': test_mm1k.k[j]
        }
        model_out = model.compute('mm1k_basic',model_in);
        var K = 'k'+test_mm1k.k[j];
        
        /* Compare result output */
        var pass = true;
        var result = '';
        if (!isNaN(model_out.load) && (model_out.load).toPrecision(4) != (test_mm1k.rho[i]).toPrecision(4))    {
            pass = false; 
            result = result+('\n       rho: '+model_out.load+   " "+test_mm1k.rho[i]);
        }
        if (!isNaN(model_out.length) && (model_out.length).toPrecision(4) != (test_mm1k.len[K][i]).toPrecision(4))  {
            pass = false; 
            result = result+('\n       len: '+model_out.length+ " "+test_mm1k.len[K][i]);
        }
        if (!isNaN(model_out.sojourn) && (model_out.sojourn).toPrecision(4) != (test_mm1k.soj[K][i]).toPrecision(4)) {
            pass = false; 
            result = result+('\n       soj: '+model_out.sojourn+" "+test_mm1k.soj[K][i]);
        }
        if (verbose) {
          console.log('   '+(pass ? 'PASS':'FAIL')
                +' lam:'+test_mm1k.lam[i]
                +' mu:' +test_mm1k.mu[i]
                +' K:'  +test_mm1k.k[j]
                +result);
        }
        numTests++;
        if (pass) numPass++;
      }
    }
    console.log('== PASS '+numPass+'/'+numTests+' ===');
}

function testSpanningTree() {
  var live_data = {
  "0000000000000001": {
    "dpid": "0000000000000001",
    "ports": [
      1,
      2,
      4294967294
    ],
    "aggregate": {
      "arrival_rate": 2,
      "departure_rate": 0,
      "depart_rate": 2
    },
    "proportion_in": [
      {
        "port_no": 1,
        "proportion": 0.5
      },
      {
        "port_no": 2,
        "proportion": 0.5
      }
    ],
    "proportion_out": [
      {
        "port_no": 1,
        "proportion": 0.5
      },
      {
        "port_no": 2,
        "proportion": 0.5
      }
    ],
    "adjacent_nodes": [
      {
        "port_no": "00000003",
        "topo_node_idx": 5,
        "neighbour": {
          "dpid": "0000000000000005",
          "port": "00000001",
          "topo_node_idx": 4
        }
      },
      {
        "port_no": "00000002",
        "topo_node_idx": 0,
        "neighbour": {
          "dpid": "0000000000000005",
          "port": "00000003",
          "topo_node_idx": 4
        }
      },
      {
        "port_no": "00000003",
        "topo_node_idx": 2,
        "neighbour": {
          "dpid": "0000000000000002",
          "port": "00000001",
          "topo_node_idx": 1
        }
      },
      {
        "port_no": "00000003",
        "topo_node_idx": 3,
        "neighbour": {
          "dpid": "0000000000000002",
          "port": "00000002",
          "topo_node_idx": 1
        }
      },
      {
        "port_no": "00000003",
        "topo_node_idx": 6,
        "neighbour": {
          "dpid": "0000000000000005",
          "port": "00000002",
          "topo_node_idx": 4
        }
      },
      {
        "port_no": "00000001",
        "topo_node_idx": 0,
        "neighbour": {
          "dpid": "0000000000000002",
          "port": "00000003",
          "topo_node_idx": 1
        }
      }
    ]
  },
  "0000000000000002": {
    "dpid": "0000000000000002",
    "ports": [
      1,
      2,
      3,
      4294967294
    ],
    "aggregate": {
      "arrival_rate": 3,
      "departure_rate": 0,
      "depart_rate": 3
    },
    "proportion_in": [
      {
        "port_no": 1,
        "proportion": 0.3333333333333333
      },
      {
        "port_no": 2,
        "proportion": 0.3333333333333333
      },
      {
        "port_no": 3,
        "proportion": 0.3333333333333333
      }
    ],
    "proportion_out": [
      {
        "port_no": 1,
        "proportion": 0.3333333333333333
      },
      {
        "port_no": 2,
        "proportion": 0.3333333333333333
      },
      {
        "port_no": 3,
        "proportion": 0.3333333333333333
      }
    ],
    "adjacent_nodes": [
      {
        "port_no": "00000003",
        "topo_node_idx": 5,
        "neighbour": {
          "dpid": "0000000000000005",
          "port": "00000001",
          "topo_node_idx": 4
        }
      },
      {
        "port_no": "00000003",
        "topo_node_idx": 4,
        "neighbour": {
          "dpid": "0000000000000001",
          "port": "00000002",
          "topo_node_idx": 0
        }
      },
      {
        "port_no": "00000001",
        "topo_node_idx": 1,
        "neighbour": {
          "dpid": "0000000000000003",
          "port": "00000003",
          "topo_node_idx": 2
        }
      },
      {
        "port_no": "00000002",
        "topo_node_idx": 1,
        "neighbour": {
          "dpid": "0000000000000004",
          "port": "00000003",
          "topo_node_idx": 3
        }
      },
      {
        "port_no": "00000003",
        "topo_node_idx": 6,
        "neighbour": {
          "dpid": "0000000000000005",
          "port": "00000002",
          "topo_node_idx": 4
        }
      },
      {
        "port_no": "00000003",
        "topo_node_idx": 1,
        "neighbour": {
          "dpid": "0000000000000001",
          "port": "00000001",
          "topo_node_idx": 0
        }
      }
    ]
  },
  "0000000000000003": {
    "dpid": "0000000000000003",
    "ports": [
      1,
      2,
      3,
      4294967294
    ],
    "aggregate": {
      "arrival_rate": 1,
      "departure_rate": 0,
      "depart_rate": 3
    },
    "proportion_in": [
      {
        "port_no": 1,
        "proportion": 0
      },
      {
        "port_no": 2,
        "proportion": 0
      },
      {
        "port_no": 3,
        "proportion": 1
      }
    ],
    "proportion_out": [
      {
        "port_no": 1,
        "proportion": 0.3333333333333333
      },
      {
        "port_no": 2,
        "proportion": 0.3333333333333333
      },
      {
        "port_no": 3,
        "proportion": 0.3333333333333333
      }
    ],
    "adjacent_nodes": [
      {
        "port_no": "00000003",
        "topo_node_idx": 5,
        "neighbour": {
          "dpid": "0000000000000005",
          "port": "00000001",
          "topo_node_idx": 4
        }
      },
      {
        "port_no": "00000003",
        "topo_node_idx": 4,
        "neighbour": {
          "dpid": "0000000000000001",
          "port": "00000002",
          "topo_node_idx": 0
        }
      },
      {
        "port_no": "00000003",
        "topo_node_idx": 2,
        "neighbour": {
          "dpid": "0000000000000002",
          "port": "00000001",
          "topo_node_idx": 1
        }
      },
      {
        "port_no": "00000003",
        "topo_node_idx": 3,
        "neighbour": {
          "dpid": "0000000000000002",
          "port": "00000002",
          "topo_node_idx": 1
        }
      },
      {
        "port_no": "00000003",
        "topo_node_idx": 6,
        "neighbour": {
          "dpid": "0000000000000005",
          "port": "00000002",
          "topo_node_idx": 4
        }
      },
      {
        "port_no": "00000003",
        "topo_node_idx": 1,
        "neighbour": {
          "dpid": "0000000000000001",
          "port": "00000001",
          "topo_node_idx": 0
        }
      }
    ]
  },
  "0000000000000004": {
    "dpid": "0000000000000004",
    "ports": [
      1,
      2,
      3,
      4294967294
    ],
    "aggregate": {
      "arrival_rate": 1,
      "departure_rate": 0,
      "depart_rate": 3
    },
    "proportion_in": [
      {
        "port_no": 1,
        "proportion": 0
      },
      {
        "port_no": 2,
        "proportion": 0
      },
      {
        "port_no": 3,
        "proportion": 1
      }
    ],
    "proportion_out": [
      {
        "port_no": 1,
        "proportion": 0.3333333333333333
      },
      {
        "port_no": 2,
        "proportion": 0.3333333333333333
      },
      {
        "port_no": 3,
        "proportion": 0.3333333333333333
      }
    ],
    "adjacent_nodes": [
      {
        "port_no": "00000003",
        "topo_node_idx": 5,
        "neighbour": {
          "dpid": "0000000000000005",
          "port": "00000001",
          "topo_node_idx": 4
        }
      },
      {
        "port_no": "00000003",
        "topo_node_idx": 4,
        "neighbour": {
          "dpid": "0000000000000001",
          "port": "00000002",
          "topo_node_idx": 0
        }
      },
      {
        "port_no": "00000003",
        "topo_node_idx": 2,
        "neighbour": {
          "dpid": "0000000000000002",
          "port": "00000001",
          "topo_node_idx": 1
        }
      },
      {
        "port_no": "00000003",
        "topo_node_idx": 3,
        "neighbour": {
          "dpid": "0000000000000002",
          "port": "00000002",
          "topo_node_idx": 1
        }
      },
      {
        "port_no": "00000003",
        "topo_node_idx": 6,
        "neighbour": {
          "dpid": "0000000000000005",
          "port": "00000002",
          "topo_node_idx": 4
        }
      },
      {
        "port_no": "00000003",
        "topo_node_idx": 1,
        "neighbour": {
          "dpid": "0000000000000001",
          "port": "00000001",
          "topo_node_idx": 0
        }
      }
    ]
  },
  "0000000000000005": {
    "dpid": "0000000000000005",
    "ports": [
      1,
      2,
      3,
      4294967294
    ],
    "aggregate": {
      "arrival_rate": 3,
      "departure_rate": 0,
      "depart_rate": 3
    },
    "proportion_in": [
      {
        "port_no": 1,
        "proportion": 0.3333333333333333
      },
      {
        "port_no": 2,
        "proportion": 0.3333333333333333
      },
      {
        "port_no": 3,
        "proportion": 0.3333333333333333
      }
    ],
    "proportion_out": [
      {
        "port_no": 1,
        "proportion": 0.3333333333333333
      },
      {
        "port_no": 2,
        "proportion": 0.3333333333333333
      },
      {
        "port_no": 3,
        "proportion": 0.3333333333333333
      }
    ],
    "adjacent_nodes": [
      {
        "port_no": "00000001",
        "topo_node_idx": 4,
        "neighbour": {
          "dpid": "0000000000000006",
          "port": "00000003",
          "topo_node_idx": 5
        }
      },
      {
        "port_no": "00000003",
        "topo_node_idx": 4,
        "neighbour": {
          "dpid": "0000000000000001",
          "port": "00000002",
          "topo_node_idx": 0
        }
      },
      {
        "port_no": "00000003",
        "topo_node_idx": 2,
        "neighbour": {
          "dpid": "0000000000000002",
          "port": "00000001",
          "topo_node_idx": 1
        }
      },
      {
        "port_no": "00000003",
        "topo_node_idx": 3,
        "neighbour": {
          "dpid": "0000000000000002",
          "port": "00000002",
          "topo_node_idx": 1
        }
      },
      {
        "port_no": "00000002",
        "topo_node_idx": 4,
        "neighbour": {
          "dpid": "0000000000000007",
          "port": "00000003",
          "topo_node_idx": 6
        }
      },
      {
        "port_no": "00000003",
        "topo_node_idx": 1,
        "neighbour": {
          "dpid": "0000000000000001",
          "port": "00000001",
          "topo_node_idx": 0
        }
      }
    ]
  },
  "0000000000000006": {
    "dpid": "0000000000000006",
    "ports": [
      1,
      2,
      3,
      4294967294
    ],
    "aggregate": {
      "arrival_rate": 1,
      "departure_rate": 0,
      "depart_rate": 3
    },
    "proportion_in": [
      {
        "port_no": 1,
        "proportion": 0
      },
      {
        "port_no": 2,
        "proportion": 0
      },
      {
        "port_no": 3,
        "proportion": 1
      }
    ],
    "proportion_out": [
      {
        "port_no": 1,
        "proportion": 0.3333333333333333
      },
      {
        "port_no": 2,
        "proportion": 0.3333333333333333
      },
      {
        "port_no": 3,
        "proportion": 0.3333333333333333
      }
    ],
    "adjacent_nodes": [
      {
        "port_no": "00000003",
        "topo_node_idx": 5,
        "neighbour": {
          "dpid": "0000000000000005",
          "port": "00000001",
          "topo_node_idx": 4
        }
      },
      {
        "port_no": "00000003",
        "topo_node_idx": 4,
        "neighbour": {
          "dpid": "0000000000000001",
          "port": "00000002",
          "topo_node_idx": 0
        }
      },
      {
        "port_no": "00000003",
        "topo_node_idx": 2,
        "neighbour": {
          "dpid": "0000000000000002",
          "port": "00000001",
          "topo_node_idx": 1
        }
      },
      {
        "port_no": "00000003",
        "topo_node_idx": 3,
        "neighbour": {
          "dpid": "0000000000000002",
          "port": "00000002",
          "topo_node_idx": 1
        }
      },
      {
        "port_no": "00000003",
        "topo_node_idx": 6,
        "neighbour": {
          "dpid": "0000000000000005",
          "port": "00000002",
          "topo_node_idx": 4
        }
      },
      {
        "port_no": "00000003",
        "topo_node_idx": 1,
        "neighbour": {
          "dpid": "0000000000000001",
          "port": "00000001",
          "topo_node_idx": 0
        }
      }
    ]
  },
  "0000000000000007": {
    "dpid": "0000000000000007",
    "ports": [
      1,
      2,
      3,
      4294967294
    ],
    "aggregate": {
      "arrival_rate": 1,
      "departure_rate": 0,
      "depart_rate": 3
    },
    "proportion_in": [
      {
        "port_no": 1,
        "proportion": 0
      },
      {
        "port_no": 2,
        "proportion": 0
      },
      {
        "port_no": 3,
        "proportion": 1
      }
    ],
    "proportion_out": [
      {
        "port_no": 1,
        "proportion": 0.3333333333333333
      },
      {
        "port_no": 2,
        "proportion": 0.3333333333333333
      },
      {
        "port_no": 3,
        "proportion": 0.3333333333333333
      }
    ],
    "adjacent_nodes": [
      {
        "port_no": "00000003",
        "topo_node_idx": 5,
        "neighbour": {
          "dpid": "0000000000000005",
          "port": "00000001",
          "topo_node_idx": 4
        }
      },
      {
        "port_no": "00000003",
        "topo_node_idx": 4,
        "neighbour": {
          "dpid": "0000000000000001",
          "port": "00000002",
          "topo_node_idx": 0
        }
      },
      {
        "port_no": "00000003",
        "topo_node_idx": 2,
        "neighbour": {
          "dpid": "0000000000000002",
          "port": "00000001",
          "topo_node_idx": 1
        }
      },
      {
        "port_no": "00000003",
        "topo_node_idx": 3,
        "neighbour": {
          "dpid": "0000000000000002",
          "port": "00000002",
          "topo_node_idx": 1
        }
      },
      {
        "port_no": "00000003",
        "topo_node_idx": 6,
        "neighbour": {
          "dpid": "0000000000000005",
          "port": "00000002",
          "topo_node_idx": 4
        }
      },
      {
        "port_no": "00000003",
        "topo_node_idx": 1,
        "neighbour": {
          "dpid": "0000000000000001",
          "port": "00000001",
          "topo_node_idx": 0
        }
      }
    ]
  }
  };

}

