/**
 * grpc服务端 参考 https://grpc.io/docs/languages/node/quickstart/
 */
const grpc = require('@grpc/grpc-js');

// 加载proto
const hello_proto = require('./proto_loader');

/**
 *
 * 实际的sayHello方法
 * 
 * @param {*} call
 * @param {*} callback 客户端传的回调方法
 */
function sayHello(call, callback) {
    console.log('客户端请求参数是', call.request);
    callback(null, { message: `hello, ${call.request.name}` });
}

function main() {
    let server = new grpc.Server();

    // 添加服务
    server.addService(hello_proto.Greeter.service, { sayHello: sayHello });

    // 启动服务
    server.bindAsync('127.0.0.1:50051', grpc.ServerCredentials.createInsecure(), () => {
        server.start();
        console.log('grpc server started in 50051');
    });
}

main();
