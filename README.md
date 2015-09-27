# OpenFlow Performance Visualizer
Visualizes the performance of an OpenFlow network using queueing theory

This project is the work-in-progress of an undergraduate final year project. 

Builds upon the topology view within OpenFlow 1.3.

## Using this application
This is a Ryu application, so simply needs to be copied into the ryu/app directory and run with ryu. Because this is built on top of the topology library, you will also need to include --observe-links.
```bash
ryu-manager --observe-links ryu/app/perfvis/perfvis.py
```
The script runryu, when edited to point to the correct directories, will copy this application and run it. Scripts are also included to set up a mininet session running OpenFlow v1.3, runsingle and runtopo.

Once running, it can be accessed via a browser, http://[controller-ip]:8080.

IMPORTANT -- There are two modes of operation, one using a live network, and another which can be run locally without a network using randomly generated input values. This is determined at the base of the perfvis/perfvis.py file.
```
/* Control for swapping between local and server modes. Comment one. */
// initLocal();    // for offline testing
initServer();   // for server
```
Swap which of the two lines is commented for the local version, which can be accessed using a webserver on localhost targeting the html directory, such as Python3's module http.server.

## Config
Models and the switch brand are declared in perfvis/html/config.js

Switches can be added here to set their average service rate, and can be selected from the GUI interface. They are defined in config.switch_configs as:
```JavaScript
'switch_name': {
    'service_rate':    0, // the average number of packets it can service per second
    'service_variance':0, // the variance in that average
}
```

Models' input and output are declared along with the name of the model. Below is a basic model description.
```JavaScript
'model_name':  { 
    'description': '',
    'model_in': [ 'service_rate', 'arrival_rate' ],
    'model_out': [ 'load', 'length', 'sojourn' ],
}
```
Additionally a model needs to register itself, accept the declared inputs and produce the declared outputs.
To register a model, it needs to be included in index.html and it must add itself to the config with:
```JavaScript
config.get_model['model_name'] = model_name;
```
