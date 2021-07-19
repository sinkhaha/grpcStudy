/**
 * gprc客户端
 */
const hello_proto = require('./proto_loader');
const grpc = require('@grpc/grpc-js');

function main() {
    // 连接rpc服务端
    let client = new hello_proto.Greeter('localhost:50051', grpc.credentials.createInsecure());

    client.sayHello({ name: 'lisi' }, function (err, response) {
        if (err) {
            console.error('Error: ', err);
        } else {
            console.log('服务端响应:', response.message);
        }
    });
}

main();
