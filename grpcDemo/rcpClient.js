'use strict';

const fs = require('fs');
const path = require('path');

const grpc = require('@grpc/grpc-js');
const util = require('./util');

const fsPromises = fs.promises;

class RpcClient {
    constructor(ip, port) {
        this.ip = ip;
        this.port = port;
        this.services = {}; // 服务对象 如 { testService: { ping: {} } }
        this.clients = {}; // ServiceClientImpl客户端对象 如 { testService: {} }
    }

    // 自动加载proto并且connect
    async autoRun(protoDir) {
        try {
            const files = await fsPromises.readdir(protoDir);
            if (!files || files.length === 0) {
                throw new Error(`${protoDir} 没有porto文件`);
            }

            for (let file of files) {
                const filePart = path.parse(file);
                const extName = filePart.ext; // 扩展名 如 .proto

                if (extName !== '.proto') {
                    console.log(`${file}不是proto文件`);
                    continue;
                }

                const { serviceName, packageName } = util.getNameByFileName(filePart.name);

                const filePath = path.join(protoDir, file);
                const ServiceConstructor = util.getServiceByProto(filePath, packageName, serviceName);
                
                this.services[serviceName] = ServiceConstructor.service;

                // 实例化
                this.clients[serviceName] = new ServiceConstructor(`${this.ip}:${this.port}`, grpc.credentials.createInsecure());
            }
        } catch (e) {
            console.log('client autoRun错误', e);
            throw e;
        }
    }

    /**
     * 统一调用入口
     * @param {*} serviceName 服务名字
     * @param {*} name 方法名
     * @param {*} params 请求参数
     * @returns 
     */
    async invoke(serviceName, name, params = {}) {
        return new Promise((resolve, reject) => {

            function callback(error, response) {
                if (error) {
                    reject(error);
                } else {
                    resolve(response);
                }
            }

            // 请求参数
            params = params || {};

            if (!this.clients[serviceName] && this.clients[serviceName][name]) {
                return reject(new Error(`对应方法不存在 ${serviceName}.${name}`));
            }

            // 调用服务端方法
            this.clients[serviceName][name](params, callback);
        });
    }
}

module.exports = RpcClient;