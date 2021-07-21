'use strict';

const fs = require('fs');
const path = require('path');
const grpc = require('@grpc/grpc-js');
const util = require('./util');

const fsPromises = fs.promises;

/**
 * 1. proto文件自动加载，跟业务方法对应
 * 2. 包名 和 服务名 可以由调用端指定
 * 
 * 在公网提供 RPC 服务，需要增加鉴权，可参考 https://www.grpc.io/docs/guides/auth/
 */
class RpcServer {
    /**
     *
     * @param {*} ip 服务的ip
     * @param {*} port 服务的端口
     * @memberof RpcServer
     */
    constructor(ip, port) {
        this.ip = ip;
        this.port = port;
        this.services = {}; // 服务对象 如 { testService: { ping: {} } }
        this.functions = {}; // 业务方法对象 如 { testService: { ping: [Function: ping] } }
    }

    /**
     *
     * 自动加载proto并且运行Server
     * 
     * @param {*} protoDir proto文件目录
     * @param {*} jsDir 业务js文件目录
     * @returns
     * @memberof RpcServer
     */
    async autoRun(protoDir, jsDir) {
        try {
            // 此处为了方便，只读一层目录
            const files = await fsPromises.readdir(protoDir);

            if (!files || files.length === 0) {
                throw new Error(`${protoDir}没有porto文件`);
            }

            for (let file of files) {
                const filePart = path.parse(file);
                const extName = filePart.ext; // 扩展名

                // console.log('server filePart', filePart);

                if (extName !== '.proto') {
                    console.log(`${file}不是proto文件`);
                    continue;
                }

                // 需要自定义一套 业务文件 跟 包名服务名 相对应的加载规则
                const { serviceName, packageName } = util.getNameByFileName(filePart.name);
         
                const protoFilePath = path.join(protoDir, file);
                this.services[serviceName] = util.getServiceByProto(protoFilePath, packageName, serviceName).service;

                // 加载js方法 js文件名跟proto文件名对应
                const jsFilePath = path.join(jsDir, `${filePart.name}.js`);
                const functions = require(jsFilePath);
                // 同名方法覆盖
                this.functions[serviceName] = Object.assign({}, functions);
            }

            return this.runServer();
        } catch (e) {
            console.log('server autoRun错误', e);
            throw e;
        }
    }

    /**
     *
     * 启动grpc服务
     * @memberof RpcServer
     */
    runServer() {
        const server = new grpc.Server();

        // console.log('this.services是', this.services);
        // console.log('this.functions是', this.functions);

        for (let serviceName of Object.keys(this.services)) {
            // 服务名
            const serviceObj = this.services[serviceName];
            
            // proto定义的所有方法名
            const protoAllFnName = Object.keys(serviceObj);
            console.log(`${serviceName}服务 proto中的所有方法名是`, protoAllFnName);

            // 所有业务方法对象
            const allFn = this.functions[serviceName];
            const allFnName = Object.keys(allFn);
            console.log(`${serviceName}服务 所有业务方法名是`, allFnName);

            // 业务方法跟proto方法对应才注册
            for (let functionName of allFnName) {
                // 业务方法 跟 proto方法同名 才添加服务
                if (protoAllFnName.includes(functionName)) {
                    server.addService(serviceObj, { [functionName]: allFn[functionName] });
                }
            }
        }

        const address = `${this.ip}:${this.port}`;
        // 异步启动服务
        server.bindAsync(address, grpc.ServerCredentials.createInsecure(), () => {
            server.start();
            console.log(`服务已启动 ${address}`);
        });
    }
}

module.exports = RpcServer;