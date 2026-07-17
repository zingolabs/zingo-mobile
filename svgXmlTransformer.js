'use strict';

// Custom SVG transformer that generates SvgXml-based components
// instead of full react-native-svg component trees.
// This avoids Fabric registration conflicts on iOS with New Architecture
// when multiple different SVG files are rendered simultaneously.

const upstreamTransformer = require('@react-native/metro-babel-transformer');

module.exports.transform = function (transformerOptions) {
  const { src, filename } = transformerOptions;

  if (filename.endsWith('.svg')) {
    const escapedXml = JSON.stringify(src);
    const jsCode = `
import React from 'react';
import { SvgXml } from 'react-native-svg';
const xml = ${escapedXml};
const SvgComponent = (props) => React.createElement(SvgXml, Object.assign({ xml: xml }, props));
export default SvgComponent;
`;
    return upstreamTransformer.transform({
      ...transformerOptions,
      src: jsCode,
      filename: filename + '.js',
    });
  }

  return upstreamTransformer.transform(transformerOptions);
};
