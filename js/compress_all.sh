#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/.."
PLUGINS="$DIR/js/plugins"
rm -f "$PLUGINS.min.js"

grep "^;scripts\[\]" "$DIR/generamics_openspace.info" | awk '{ print $3 }' | while read LINE
do
  cat $LINE >> $PLUGINS.min.js
done

exit 0
