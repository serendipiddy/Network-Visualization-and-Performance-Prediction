offlinetesting = false;
// offlinetesting = true;

var config = {
  'switch_default': 'openvswitch_vm',
  'model_default':  'mm1_basic',
  'get_model': { /* model objects are stored in their own files and loaded from there */},
  'switch_configs': {
    /* The 'brand'/name of the switch determines mean service rate */
    /* 'pica8' 'openWRT' 'facebook' etc */
    'openvswitch_vm': {
          'service_rate': 92185,
        },
    'pica8':  {
          'service_rate':  106557,
        },
    'user_defined': {
          'service_rate': 56625,
        },
  },
  'controller': {
    'ryu-mininet': {
        'service_rate': 593.47
    }
  },
  'queueing_models': { /* each model is stored in 'model/name.js' */ },
  'graphed_inputs': [],
  'graphed_outputs': [],
  'node_status': [ 'active', 'inactive', 'removed', 'additional' ],
  'config_keys': ['switch_brand', 'queueing_model', 'service_rate', 'pnf', 'queue_capacity'],
  'adjustment_keys': ['service_rate','arrival_rate','pnf','queue_capacity'],
  'sojourn_scale': 1000000, // converts to micro second, rather than second
}

