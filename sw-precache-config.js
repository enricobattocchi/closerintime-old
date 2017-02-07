module.exports = {
  staticFileGlobs: [
    'css/**.css',
    '**.html',
    'img/**.*',
    'js/**.js'
  ],
  verbose: true,
  runtimeCaching: [{
    urlPattern: 'lookup.php',
    handler: 'networkFirst'
  }]
};
