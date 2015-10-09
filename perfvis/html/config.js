var config = {
  'switch_default': 'openvswitch_vm',
  'model_default':  'mm1_basic',
  'get_model': {},
  'switch_configs': {
    /* The 'brand'/name of the switch determines mean service rate */
    /* 'pica8' 'openWRT' 'facebook' etc */
    'openvswitch_vm': {
          'service_rate': 92185,
          'service_variance': 0,
        },
    'pica8':  {
          'service_rate':  106557,
          'service_variance': 0,
        },
    'user_defined': {
          'service_rate': 56625,
          'service_variance': 0,
        },
  },
  'controller': {
    'ryu-mininet': {
        'service_rate': 593.47
    }
  },
  'queueing_models': {
    /* each model is stored in 'model/name.js' */
    'mm1_basic':  { 
                    'description': 'Simple M/M/1 model, runs per node',
                    'model_in':  [ 'service_rate', 'arrival_rate' ],
                    'model_out': [ 'load', 'length', 'sojourn' ],
                    'rho_support': 'unit_interval', /* Only supports rho [0,1) */
                  },
    'mm1k_basic':  { 
                    'description': 'Simple M/M/1/K model, runs per node',
                    'model_in':  [ 'service_rate', 'arrival_rate', 'queue_capacity' ],
                    'model_out': [ 'load', 'length', 'sojourn', 'packet_loss' ],
                    'rho_support': 'positive', /* Supports any positive rho [0,+inf] */
                  },
  },
  'node_status': [ 'active', 'inactive', 'removed', 'additional' ],
  'config_keys': ['switch_brand', 'queueing_model', 'service_rate', 'pnf', 'queue_capacity'],
  'adjustment_keys': ['service_rate','arrival_rate','pnf','queue_capacity'],
}

offlinetesting = false;
//offlinetesting = true;
