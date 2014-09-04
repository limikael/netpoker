#!/usr/bin/env node

var NetPokerServer = require("../../src/js/server/app/NetPokerServer");
var Backend = require("../../src/js/server/backend/Backend");
var MockBackendServer = require("../utils/MockBackendServer");
var minimist = require("minimist");

var port = 2000;
var mockBackendPort = 9999;

var mockBackendServer = new MockBackendServer();
mockBackendServer.setListenPort(mockBackendPort);
mockBackendServer.start();

var netPokerServer = new NetPokerServer();
netPokerServer.setListenPort(port);
netPokerServer.setBackend(new Backend("http://localhost:" + mockBackendPort));
netPokerServer.run();

console.log("Mockserver started on port " + port);