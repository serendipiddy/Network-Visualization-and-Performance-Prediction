#!/bin/bash

SRC="home/mininet/vis"
DST="home/mininet/ryu/ryu/app/"
RYU="home/mininet/ryu"

cp $SRC/perfte.py $DST/perfte.py
cp $SRC/simple_switch_13.py $DST/simple_switch_13.py
cp $SRC/gui_vis $DST/gui_vis

PYTHONPATH=$RYU $RYU/ryu/bin/ryu-manager --observe-links $RYU/ryu/app/gui_vis/gui_vis.py