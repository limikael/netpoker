#!/usr/bin/env node

var minimist = require("minimist");
var NetPokerServer = require("./app/NetPokerServer");

let args = minimist(process.argv.slice(2));
let server=new NetPokerServer(args);
server.run();