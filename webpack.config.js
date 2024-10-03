const path = require('path'),
  HtmlWebpackPlugin = require('html-webpack-plugin'),
  CopyPlugin = require('copy-webpack-plugin'),
  { CleanWebpackPlugin } = require('clean-webpack-plugin'),
  OverwolfPlugin = require('./overwolf.webpack');

module.exports = env => ({
  entry: {
    background: './src/background/background.ts',
    desktop: './src/desktop/desktop.ts',
    in_game: './src/in_game/in_game.ts',
  },
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf|svg|png|jpg|gif)$/,
        type: 'asset/resource',
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    path: path.resolve(__dirname, 'dist/'),
    filename: 'js/[name].js',
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyPlugin({
      patterns: [
        { from: 'public', to: './' },
      ],
    }),
    new HtmlWebpackPlugin({
      template: './src/background/background.html',
      filename: 'background.html',
      chunks: ['background'],
    }),
    new HtmlWebpackPlugin({
      template: './src/desktop/desktop.html',
      filename: 'desktop.html',
      chunks: ['desktop'],
    }),
    new HtmlWebpackPlugin({
      template: './src/in_game/in_game.html',
      filename: 'in_game.html',
      chunks: ['in_game'],
    }),
    new OverwolfPlugin(env),
  ],
});
