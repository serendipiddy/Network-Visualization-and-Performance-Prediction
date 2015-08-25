var config = {
  'switch_default': 'openvswitch_vm',
  'model_default':  'mm1_basic',
  'get_model': {},
  'switch_configs': {
    /* The 'brand'/name of the switch determines mean service rate */
    /* 'pica8' 'openWRT' 'facebook' etc */
    'openvswitch_vm': {
                        'service_rate': 56625,
                        'service_variance':0,
                      },
    'pica8':  {
                'service_rate': 9001,
                'service_variance':0,
              },
  },
  'queueing_models': {
    /* each model is stored in 'model/name.js' */
    'mm1_basic':  { 
                    'description': 'Simple M/M/1 model, runs per node',
                    'model_in': [ 'service_rate', 'arrival_rate' ],
                    'model_out': [ 'load', 'length', 'sojourn' ],
                  },
    'mm1k_basic':  { 
                    'description': 'Simple M/M/1/K model, runs per node',
                    'model_in': [ 'service_rate', 'arrival_rate', 'queue_capacity' ],
                    'model_out': [ 'load', 'length', 'sojourn' ],
                  },
  },
}

var output = function(model_name, input) {
    var model_config = config.queueing_models[model_name];
    var model = config.get_model[model_name];
    
    var model_in = {};
    /* Check input data */
    for (var i = 0; i < model_config.model_in.length; i++) {
        val = model_config.model_in[i];
        if (!val in input) {
          console.log('Model required input \''+val+'\' not found');
          return;
        }
        /* check that each val is valid */
        model_in[val] = input[val];
    }
    
    model.set_input(model_in);
    
    var results = {};
    /* Construct results from configuration */
    for (var i = 0; i < model_config.model_out.length; i++) {
        fn = model_config.model_out[i];
        results[fn] = model[fn]();
    }
    
    return results;
}