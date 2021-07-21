'use strict';

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

/**
 *
 * 加载proto文件的服务方法
 * 
 * @param {*} filePath
 * @param {*} packageName
 * @param {*} serviceName
 * @returns
 */
function getServiceByProto(filePath, packageName, serviceName) {
    const packageDefinition = protoLoader.loadSync(filePath, {
        keepCase: true, // 方法映射成小驼峰
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    });
    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);

    const serviceConstructor = protoDescriptor[packageName][serviceName];

    return serviceConstructor;
}

/**
 * 根据文件名获取包名和服务名
 *
 * @param {*} fileName
 * @returns
 */
function getNameByFileName(fileName) {
    fileName = myLower(fileName);

    // 约定包名和服务名为文件名加上相应后缀
    const serviceName = `${fileName}Service`; // 文件名+Service
    const packageName = `${fileName}Package`; // 文件名+Package

    return { serviceName, packageName };
}

/**
 *
 * 下划线转小驼峰
 * @param {*} fileName
 * @returns
 */
function myLower(fileName) {
    let property = fileName.replace(/[_-][a-z]/ig, s => s.substring(1).toUpperCase());
    let first = property[0].toLowerCase();
    return first + property.substring(1);
}

module.exports = {
    getServiceByProto,
    getNameByFileName,
    myLower
};