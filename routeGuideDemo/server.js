'use strict';

const path = require('path');
const fs = require('fs');
const parseArgs = require('minimist');
const _ = require('lodash');
const grpc = require('@grpc/grpc-js');
const routeguide = require('./proto_loader');
const config = require('./config');
let COORD_FACTOR = 1e7; // 坐标因子

/**
 * 位置对象列表
 */
let feature_list = [];

/**
 * 记录位置信息
 */
let route_notes = {};

/**=====================service方法实现===================== */
/**
 * getFeature方法实现
 * @param {EventEmitter} call
 * @param {function(Error, feature)} callback 为客户端传的回调方法
 */
function getFeature(call, callback) {
    const featureInfo = getFeatureByPointFromList(call.request);
    callback(null, featureInfo);
}

/**
 * getFeaturesList方法实现
 * @param {Writable} call 可写流对象
 */
function getFeaturesList(call) {
    let lo = call.request.lo; // 获取请求中的lo参数
    let hi = call.request.hi;

    let left = _.min([lo.longitude, hi.longitude]);
    let right = _.max([lo.longitude, hi.longitude]);
    let top = _.max([lo.latitude, hi.latitude]);
    let bottom = _.min([lo.latitude, hi.latitude]);

    // 对于每个特征检查它是否在给定的边界框中
    _.each(feature_list, function (feature) {
        if (feature.name === '') {
            return;
        }

        if (feature.location.longitude >= left &&
            feature.location.longitude <= right &&
            feature.location.latitude >= bottom &&
            feature.location.latitude <= top) {

            // 往可写流写入数据    
            call.write(feature);
        }
    });

    // 结束流
    call.end();
}

/**
 * recordRoute方法实现
 * @param {Readable} call 可读流
 * @param {function(Error, routeSummary)} callback
 */
function recordRoute(call, callback) {
    let point_count = 0;
    let feature_count = 0;
    let distance = 0;
    let previous = null;

    // Start a timer
    let start_time = process.hrtime();

    // 可读流，监听数据
    call.on('data', function (point) {
        point_count += 1;
        if (getFeatureByPointFromList(point).name !== '') {
            feature_count += 1;
        }

        if (previous != null) {
            distance += getDistance(previous, point);
        }

        previous = point;
    });

    // 可读流中没有数据消费则触发
    call.on('end', function () {
        callback(null, {
            point_count: point_count,
            feature_count: feature_count,
            // 转成数字类型
            distance: distance | 0,
            // End the timer
            elapsed_time: process.hrtime(start_time)[0]
        });
    });
}

/**
 * routeChat方法实现
 * @param {Duplex} call
 */
function routeChat(call) {
    call.on('data', function (note) {
        let key = pointToKey(note.location);

        if (route_notes.hasOwnProperty(key)) {
            _.each(route_notes[key], function (note) {
                call.write(note);
            });
        } else {
            route_notes[key] = [];
        }

        route_notes[key].push(JSON.parse(JSON.stringify(note)));
    });

    call.on('end', function () {
        call.end();
    });
}


/**=====================一些共用方法===================== */
/**
 *
 * 获取一个feature对象
 * @param {*} point
 * @returns
 */
function getFeatureByPointFromList(point) {
    // feature_list里有该point的信息，则直接返回该feature
    for (let i = 0; i < feature_list.length; i++) {
        let feature = feature_list[i];
        if (feature.location.latitude === point.latitude &&
            feature.location.longitude === point.longitude) {
            return feature;
        }
    }

    return {
        name: '',
        location: point
    };
}

/**
 * 转换成key
 * @param {point} point
 * @return {string}
 */
function pointToKey(point) {
    return point.latitude + ' ' + point.longitude;
}

/**
 * 使用 haversine公式 计算两点之间的距离
 * 
 * @param start 起点
 * @param end 终点
 * @return
 */
function getDistance(start, end) {
    function toRadians(num) {
        return num * Math.PI / 180;
    }

    let R = 6371000;  // 地球半径，单位米
    let lat1 = toRadians(start.latitude / COORD_FACTOR);
    let lat2 = toRadians(end.latitude / COORD_FACTOR);
    let lon1 = toRadians(start.longitude / COORD_FACTOR);
    let lon2 = toRadians(end.longitude / COORD_FACTOR);

    let deltalat = lat2 - lat1;
    let deltalon = lon2 - lon1;

    let a = Math.sin(deltalat / 2) * Math.sin(deltalat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(deltalon / 2) * Math.sin(deltalon / 2);

    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**========================================== */

function main() {
    let server = new grpc.Server();

    // 注册RouteGuide服务里的方法
    server.addService(routeguide.RouteGuide.service, {
        getFeature: getFeature,
        getFeaturesList: getFeaturesList,
        recordRoute: recordRoute,
        routeChat: routeChat
    });

    server.bindAsync(config.listeningAddress, grpc.ServerCredentials.createInsecure(), () => {
        // 获取启动路径中的dp_path参数，如启动 node server.js --mock_data_path=mock_data.json
        let argv = parseArgs(process.argv, {
            string: config.mockDataPathName
        });

        const mockDataPath = argv.mock_data_path || config.mockDataPath;

        // 读取mock_data.json文件mock的位置数据然后启动服务
        fs.readFile(path.resolve(mockDataPath), function (err, data) {
            if (err) throw err;

            feature_list = JSON.parse(data);

            server.start();

            console.log('grpc started 127.0.0.1:50051');
        });
    });

}

main();
