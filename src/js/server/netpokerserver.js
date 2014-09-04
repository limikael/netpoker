#!/usr/bin/env node

var minimist = require("minimist");
var NetPokerServer = require("./app/NetPokerServer");
var MockBackendServer = require("./backend/MockBackendServer");
var Backend = require("./backend/Backend");

var args = minimist(process.argv.slice(2));

var netPokerServer = new NetPokerServer();

netPokerServer.setListenPort(args["clientport"]);

var backend = new Backend("http://localhost:9999");

netPokerServer.run();

console.log(args);