module.exports = {
  staticFileGlobs: [
    'css/**.css',
    '**.html',
    'img/**.*',
    'js/**.js',
    'fonts/**.*'
  ],
  importScripts: [
     'js/suggestions-sync.js'
  ],
  verbose: true,
  runtimeCaching: [{
    urlPattern: 'lookup.php',
    handler: 'networkFirst'
  }]
};
