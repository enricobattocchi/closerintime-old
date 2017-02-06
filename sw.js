self.addEventListener('install', function(e) {
	e.waitUntil(
		caches.open('closerinti.me').then(function(cache) {
			return cache.addAll([
				'/',
				'/index.html',
				'/js/jquery-3.1.1.min.js',
				'/js/bootstrap.min.js',
				'/js/typeahead.bundle.min.js',
				'/js/script.js',	
				'/css/bootstrap.min.css',
				'/css/bootstrap-theme.min.css',
				'/css/font-awesome.min.css',
				'/css/typeahead.css',
				'/css/style.css',
				'/img/icone.png',
				'/fonts/comfortaa-regular-webfont.woff2',
				'/fonts/comfortaa-regular-webfont.woff',
				'/fonts/fontawesome-webfont.eot?v=4.7.0',
				'/fonts/fontawesome-webfont.eot?#iefix&v=4.7.0',
				'/fonts/fontawesome-webfont.woff2?v=4.7.0',
				'/fonts/fontawesome-webfont.woff?v=4.7.0',
				'/fonts/fontawesome-webfont.ttf?v=4.7.0',
				'/fonts/fontawesome-webfont.svg',
				'/lookup.php'
			]);
		})
	);
});

self.addEventListener('fetch', function(event) {
	console.log(event.request.url);
	event.respondWith(
		caches.match(event.request).then(function(response) {
			return response || fetch(event.request);
		})
	);
});