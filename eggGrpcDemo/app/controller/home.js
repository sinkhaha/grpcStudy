'use strict';

const Controller = require('egg').Controller;

/**
 *
 */
class HomeController extends Controller {
  /**
   *
   *
   * @param {*} ctx ctx
   * @memberof HomeController
   */
  async sayHelloToServer(ctx) {
    // 获得HelloService服务实例
    const client = this.ctx.grpc.helloDemo.helloService;

    // this.app.logger.info('helloService实例', helloService);

    // 向grpc服务端发送请求
    const result = await client.sayHello({
      code: '0',
      message: 'helloworld',
    });

    this.app.logger.info('服务端响应结果', result);

    ctx.body = result;
  }
}

module.exports = HomeController;
