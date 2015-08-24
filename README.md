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
