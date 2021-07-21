'use strict';

const path = require('path');
const grpc = require('grpc');
const protoLoader = require('@grpc/proto-loader');

const PROTO_FILE_PATH = path.join(__dirname, 'app', 'proto', 'hello.proto');

const PORT = '50051'; // RPC服务端端口

class AppBootHook {
  constructor(app) {
    this.app = app;
  }

  /**
   * 文件加载完成
   */
  async didLoad() {
    const server = new grpc.Server();

    // 异步加载proto文件
    await protoLoader.load(PROTO_FILE_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    }).then(packageDefinition => {

      // 获取proto
      const helloProto = grpc.loadPackageDefinition(packageDefinition);

      // 获取package
      const helloDemoInstance = helloProto.helloDemo;

      // 定义HelloService的SayHello实现
      const sayHello = (call, callback) => {
        console.log('客户端请求内容', call.request);

        // 响应客户端
        callback(null, {
          code: '0',
          message: 'hi',
        });
      };

      // 将sayHello方法的实现放入grpc服务器中
      server.addService(helloDemoInstance.HelloService.service, { sayHello });
    });

    // 启动grpc服务监听
    server.bind(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure());
    server.start();
  }
}

module.exports = AppBootHook;
