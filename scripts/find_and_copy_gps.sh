#!/bin/bash

if [ $# -ne 2 ]; then
    echo "Usage: bash $0 /path/to/203gps /path/to/new_folder"
    exit 1
fi

SRC=$1
DST=$2

mkdir -p $DST

find $SRC -name "*.git" -printf '%p\n' -exec cp {} $DST \;
find $SRC -name "*.gpx" -printf '%p\n' -exec cp {} $DST \;
