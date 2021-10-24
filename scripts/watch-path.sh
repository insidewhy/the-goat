#!/bin/sh

yarn build && exec concurrently "yarn build-watch" "yarn jest-watch --testPathPattern=$1"
