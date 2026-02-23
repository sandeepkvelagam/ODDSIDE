const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for .cjs files (for nativewind)
config.resolver.sourceExts.push('cjs');

module.exports = config;
