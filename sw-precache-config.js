module.exports = {
  staticFileGlobs: [
    'css/**.css',
    '**.html',
    'img/**.*',
    'js/**.js',
    'fonts/**.*'
  ],
  verbose: true,
  runtimeCaching: [{
    urlPattern: 'lookup.php',
    handler: 'networkFirst'
  }]
};
