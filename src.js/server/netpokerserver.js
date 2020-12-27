#!/usr/bin/env node

const minimist = require("minimist");
const NetPokerServer = require("./app/NetPokerServer");
const fs=require("fs");

function usage() {
	console.log("Usage: netpokerserver <options>");
	console.log("");
	console.log("Port is required.");
	console.log("");
	console.log("Options:");
	console.log("");
	console.log("  --port <port>         Port where to listen.");
	console.log("  --config <filename>   Load config from file.");
	console.log("");

	process.exit(1);
}

let args=minimist(process.argv.slice(2));
if (args.config)
	args={...args,...JSON.parse(fs.readFileSync(args.config))};

let server=new NetPokerServer(args);

if (server.getSettingsError()) {
	console.log(server.getSettingsError());
	console.log();
	usage();
}

server.run();