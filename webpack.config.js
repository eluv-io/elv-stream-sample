const webpack = require("webpack");
const Path = require("path");
const autoprefixer = require("autoprefixer");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;
const HtmlWebpackPlugin = require("html-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const HtmlWebpackInlineSourcePlugin = require("html-webpack-inline-source-plugin");

let plugins = [
  new HtmlWebpackPlugin({
    title: "Eluvio Stream Sample",
    template: Path.join(__dirname, "src", "index.html"),
    cache: false,
    filename: "index.html",
    favicon: "src/static/icons/favicon-light.png"
  }),
  new CopyWebpackPlugin([{
    from: Path.join(__dirname, "configuration.js"),
    to: Path.join(__dirname, "dist", "configuration.js")
  }]),
];

module.exports = {
  entry: "./src/index.js",
  target: "web",
  output: {
    path: Path.resolve(__dirname, "dist"),
    filename: "index.js",
    chunkFilename: "[name].[contenthash].bundle.js"
  },
  devServer: {
    disableHostCheck: true,
    inline: true,
    port: 8084,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
      "Access-Control-Allow-Methods": "POST"
    }
  },
  resolve: {
    alias: {
      configuration: Path.join(__dirname, "configuration.json")
    }
  },
  optimization: {
    splitChunks: {
      chunks: "all"
    }
  },
  node: {
    fs: "empty"
  },
  mode: "development",
  devtool: "eval-source-map",
  plugins,
  module: {
    rules: [
      {
        test: /\.(css|scss)$/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              importLoaders: 2
            }
          },
          {
            loader: "postcss-loader",
            options: {
              plugins: () => [autoprefixer({})]
            }
          },
          "sass-loader"
        ]
      },
      {
        test: /\.(js|mjs)$/,
        exclude: /node_modules\/(?!elv-components-js)/,
        loader: "babel-loader",
        options: {
          presets: [
            "@babel/preset-env",
            "@babel/preset-react",
            "babel-preset-mobx"
          ],
          plugins: [
            ["@babel/plugin-proposal-decorators", { "version": "legacy" }],
            require("@babel/plugin-proposal-object-rest-spread"),
            require("@babel/plugin-transform-regenerator"),
            require("@babel/plugin-transform-runtime"),
            require("@babel/plugin-proposal-optional-chaining"),
            require("@babel/plugin-transform-modules-commonjs"),
            ["@babel/plugin-proposal-private-methods", { loose: true }],
            ["@babel/plugin-proposal-private-property-in-object", { "loose": true }]
          ]
        }
      },
      {
        test: /\.svg$/,
        loader: "svg-inline-loader"
      },
      {
        test: /\.(gif|png|jpe?g)$/i,
        use: ["file-loader"],
      },
      {
        test: /\.(txt|bin|abi)$/i,
        loader: "raw-loader"
      }
    ]
  }
};

