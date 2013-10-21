#!/bin/bash

rm -f /tmp/dirs /tmp/urls
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )/.."

cat $DIR/.gitmodules | grep "path = " | while read P
do
  echo "$P" | awk '{ print $3 }' >> /tmp/dirs
done

cat $DIR/.gitmodules | grep "url = " | while read P
do
  echo "$P" | awk '{ print $3 }' >> /tmp/urls
done

for i in `seq $( cat /tmp/dirs | wc -l )`
do
  git clone https://github.com/$( sed -n -e ${i}p /tmp/urls | cut -d ":" -f 2 ) $DIR/$( sed -n -e ${i}p /tmp/dirs )
done

exit 0
