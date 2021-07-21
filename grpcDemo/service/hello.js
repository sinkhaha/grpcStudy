'use strict';

/**
 *
 *
 * @param {*} call
 * @param {*} callback
 */
 function sayHello(call, callback) {
    console.log('客户端请求参数是', call.request);
    callback(null, { message: `hello, ${call.request.name}` });
}

module.exports = {
    sayHello
};