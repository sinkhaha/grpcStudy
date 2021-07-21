'use strict';

/**
 *
 *
 * @param {*} call
 * @param {*} callback
 */
function ping(call, callback) {
    console.log('客户端请求参数', call.request);
    callback(null, { message: 'pong' });
}

module.exports = {
    ping
};