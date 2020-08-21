const path = require('path');

module.exports = {
  mode: 'development',
  devtool: '',
  entry: './src/knative.ts',
  output: {
    filename: 'knative.js',
    path: path.resolve(__dirname, 'dist'),
    library: '_octantPlugin',
    libraryTarget: 'var',
    libraryExport: 'default',
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|tsx|ts)$/,
        loader: "babel-loader",
        exclude: {
          test: /node_modules\/core-js/,
        },
        options: {
          presets: [
            [
              "@babel/preset-env",
              {
                forceAllTransforms: true,
                corejs: {
                  version: 3,
                  proposals: true,
                },
                useBuiltIns: "entry",
              },
            ],
            "@babel/preset-typescript",
          ],
          plugins: [
            "@babel/plugin-syntax-dynamic-import",
            "@babel/proposal-class-properties",
            "@babel/proposal-object-rest-spread",
            "@babel/plugin-transform-object-set-prototype-of-to-assign",
          ],
        },
      },
    ],
  },
  resolve: {
    extensions: ["*", ".js", ".jsx", ".tsx", ".ts"],
  },
};
