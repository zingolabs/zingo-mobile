#! /usr/bin/env bash

PHASES=("constructdockerimages" "runcargobuilds" "exportbuiltartifacts");
DOCPHASES="";
for phase in "${PHASES[@]}"
do
  DOCPHASES+="\t$phase\n";
done
USAGE="Usage: pass a single argument to run a specific phase\n  valid phases: \n"$DOCPHASES;
if [ "$#" -gt 1 ] || [ "$1" == "help" ] || [ "$1" == "-h" ] || [ "$1" == "--help" ];
then
  tabs 4
  echo -e $USAGE; 
  echo
  echo "This script manages three phases of the NDK pipeline.  It expects 1 or 0 args."
  echo "Invocation without args is the backwards compatible default that runs everything."
  echo "If there's a single arg it must either specify a phase, or request help."
  echo "No other arguments are valid."
  
  if [ "$#" -gt 1 ];
  then
    exit -1;
  fi
  exit 0;
fi

# Default behavior, this is backwards compatible with the original workflow and 
# consistent with the project README.
if [ "$#" -eq 0 ];
then
  for phase in "${PHASES[@]}"
  do
    ./buildphases/$phase.sh;
  done
  exit 0;
else 
  for phase in "${PHASES[@]}" # This loops contains the logic for running a single phase
  do
    if [ "$1" == "$phase" ];
    then
      ./buildphases/$1.sh;
      exit 0;
    fi
  done
  echo Error:  $1 is not a phase;
  exit -1
fi
