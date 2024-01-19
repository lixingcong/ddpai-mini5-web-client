#!/bin/bash

if [ $# -ne 3 ]; then
    echo "Usage:"
    echo "  bash $0 [cp/mv] SRC DEST"
    echo ""
    echo "Example:"
    echo "  bash $0 cp /path/to/203gps /path/to/copy_to_folder"
    echo "  bash $0 mv /path/to/203gps /path/to/move_to_folder"
    exit 1
fi

CMD=$1
SRC=$2
DST=$3

case $CMD in
    cp)
    mkdir -p $DST
    find $SRC -name "*.git" -printf 'copy %p\n' -exec cp {} $DST \;
    find $SRC -name "*.gpx" -printf 'copy %p\n' -exec cp {} $DST \;
    ;;

    mv)
    mkdir -p $DST
    find $SRC -name "*.git" -printf 'move %p\n' -exec mv {} $DST \;
    find $SRC -name "*.gpx" -printf 'move %p\n' -exec mv {} $DST \;
    ;;

    *)
    echo "Unsupported cmd: $CMD"
    exit 1
    ;;
esac
