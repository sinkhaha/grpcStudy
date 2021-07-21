'use strict';

module.exports = app => {
  const { router, controller } = app;

  router.get('/sayHello', controller.home.sayHelloToServer);
};
