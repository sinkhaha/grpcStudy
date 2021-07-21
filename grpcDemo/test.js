
'use strict';

const path = require('path');
const config = require('./config');
const RpcClient = require('./rcpClient');

const ip = config.grpc.ip;
const port = config.grpc.port;
const protoPath = path.join(__dirname, './protos/');

async function initRpcClient() {
    const rpcClient = new RpcClient(ip, port);
    await rpcClient.autoRun(protoPath);
    return rpcClient;
}

/**
 *
 * 测试
 */
async function test() {
    try {
        const rpcClient = await initRpcClient();

        // 调用testService服务的ping方法
        const result = await rpcClient.invoke('testService', 'ping', { message: 'ping' });
        console.log('结果是', result);

        // 调用helloService服务的sayHello方法
        const rst = await rpcClient.invoke('helloService', 'sayHello', { name: 'lisi' });
        console.log('结果是', rst);
    } catch (err) {
        console.log(err);
    }
}

test();
