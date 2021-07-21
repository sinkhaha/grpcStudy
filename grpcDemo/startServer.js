
'use strict';

const path = require('path');
const config = require('./config');
const RpcServer = require('./rpcServer');

const ip = config.grpc.ip;
const port = config.grpc.port;
const protoPath = path.join(__dirname, './protos/');
const jsPath = path.join(__dirname, './service/');

(async function initRpcServer() {
    const rpcServer = new RpcServer(ip, port);
    await rpcServer.autoRun(protoPath, jsPath);
})()
