'use strict';

const fs = require('fs');
const path = require('path');
const async = require('async');
const parseArgs = require('minimist');
const _ = require('lodash');
const grpc = require('@grpc/grpc-js');
const routeguide = require('./proto_loader');
const config = require('./config');

let client = new routeguide.RouteGuide(config.listeningAddress, grpc.credentials.createInsecure());

let COORD_FACTOR = 1e7;  // 坐标因子

function testGetFeature() {
    /**
     *
     * 调用getFeature方法后的回调方法
     * @param {*} error 错误信息
     * @param {*} feature 服务返回的位置信息
     * @returns
     */
    function featureCallback(error, feature) {
        if (error) {
            console.log('featureCallback 错误', error);
            return;
        }

        if (feature.name === '') {
            console.log(`获取不到位置信息 (${feature.location.latitude / COORD_FACTOR}, ${feature.location.longitude / COORD_FACTOR})`);
        } else {
            console.log(`获取到位置信息 name=${feature.name} (${feature.location.latitude / COORD_FACTOR}, ${feature.location.longitude / COORD_FACTOR})`);
        }
    }

    let point1 = {
        latitude: 409146138,
        longitude: -746188906
    };
    let point2 = {
        latitude: 0,
        longitude: 0
    };

    // 调用getFeature方法
    client.getFeature(point1, featureCallback);
    client.getFeature(point2, featureCallback);
}


function testGetFeaturesList() {
    let rectangle = {
        lo: {
            latitude: 400000000,
            longitude: -750000000
        },
        hi: {
            latitude: 420000000,
            longitude: -730000000
        }
    };

    console.log('开始从位置列表中查找 在 (40, -75) 和 (42, -73) 之间的位置信息');

    // 调用getFeaturesList方法
    let call = client.getFeaturesList(rectangle);

    // 因为服务端发送消息流给客户端，所以客户端需要监听流中的数据
    call.on('data', function (feature) {
        console.log(`找到位置信息 name=${feature.name} (${feature.location.latitude / COORD_FACTOR}, ${feature.location.longitude / COORD_FACTOR})`);
    });

    call.on('end', function () {
        console.log('testGetFeaturesList 流结束');
    });
}

function testRecordRoute() {
    let argv = parseArgs(process.argv, {
        string: config.mockDataPathName
    });

    const mockDataPath = argv.mock_data_path || config.mockDataPath;

    fs.readFile(path.resolve(mockDataPath), function (err, data) {
        if (err) {
            console.log('testRecordRoute错误', err);
            return;
        }

        let feature_list = JSON.parse(data);

        let num_points = 10;

        let call = client.recordRoute(function (error, stats) {
            if (error) {
                console.log('testRecordRoute recordRoute错误', error);
                return;
            }

            console.log('统计信息', stats);
        });

        /**
         * @param {number} lat The latitude to send
         * @param {number} lng The longitude to send
         * @return {function(function)} The function that sends the point
         */
        function pointSender(latitude, longitude) {
            /**
             * @param {function} callback Called when complete
             */
            return function (callback) {
                console.log(`testRecordRoute 找到位置 (${latitude / COORD_FACTOR}, ${longitude / COORD_FACTOR})`);
                call.write({ latitude, longitude });

                _.delay(callback, _.random(500, 1500));
            };
        }

        let point_senders = [];

        for (let i = 0; i < num_points; i++) {
            let rand_point = feature_list[_.random(0, feature_list.length - 1)];

            point_senders[i] = pointSender(rand_point.location.latitude, rand_point.location.longitude);
        }

        async.series(point_senders, function () {
            call.end();
        });
    });
}

/**
 * 
 * @param {function} 
 */
function testRouteChat() {
    // 调用routeChat方法
    let call = client.routeChat();

    call.on('data', function (note) {
        console.log(`接收到消息: ${note.message} (${note.location.latitude} ${note.location.longitude})`);
    });

    call.on('end', function() {
        console.log('runRouteChat流结束');
    });

    let notes = [{
        location: {
            latitude: 0,
            longitude: 0
        },
        message: '这是第1条消息'
    }, {
        location: {
            latitude: 0,
            longitude: 1
        },
        message: '这是第2条消息'
    }];

    for (let note of notes) {
        console.log(`发送消息: ${note.message} (${note.location.latitude} ${note.location.longitude})`);
        call.write(note);
    }

    call.end();
}

function main() {
    testGetFeature();
    testGetFeaturesList();
    testRecordRoute();
    testRouteChat();
}

main();
