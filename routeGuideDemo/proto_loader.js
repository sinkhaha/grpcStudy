/**
 * 加载proto文件
 */
const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// 此处只有一个proto文件，可以做成工具统一导出
const PROTO_PATH = path.join(__dirname, 'route_guide.proto');

// 加载proto文件
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);

const routeguide = protoDescriptor.routeguide; // routeguide为包名

module.exports = routeguide;

