#Summary of testing files

##Testing scale
The application's web page is loaded with functions that test the time for events to occur. This is used to measure the time taken to perform statistics updates on the client-side as the size of the network scales.

Within the offline update loop, 

Each time the app page is requested a different sample topology file is loaded into the webpage. The file 'index.js' determines the topology file used each time the application is loaded, by altering which topology file the source code references and cycling through the 12 different topologies.

