const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for .cjs files (for nativewind)
config.resolver.sourceExts.push('cjs');

// Configure server to use the tunnel URL without port
config.server = {
  ...config.server,
  port: 8081,
};

module.exports = config;
