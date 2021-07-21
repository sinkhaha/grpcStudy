'use strict';

module.exports = appInfo => {
  const config = exports = {};

  config.keys = appInfo.name + '_4123676481413_5421';

  // egg-grpc配置
  config.grpc = {
    endpoint: '127.0.0.1:50051', // 服务地址
  };

  return config;
};
