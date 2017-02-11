self.addEventListener('sync', function(event) {
	if (event.tag == 'suggestions' || event.tag == 'test-tag-from-devtools') {
		event.waitUntil(pushSuggestionsSW());
	}
});


self.addEventListener('message', event => {
	if (event.data == 'pushSuggestions') {
		pushSuggestionsSW();
	}
});

var suggestions;

function pushSuggestionsSW(){
	db = new Dexie("closerintime");
	db.open().then(function(db){
		suggestions = db.table('suggestions');
		suggestions.toArray()
		.then(function(data){		
			if (data.length){
				var myInit = {
						method: 'post',
						headers: {
							'Accept': 'application/json, text/plain, */*',
							'Content-Type': 'application/json'
						},
						body: encodeURI(JSON.stringify(data))
				}

				var myRequest = new Request('suggest.php');

				fetch(myRequest,myInit).then(function(response) {
					console.log("Suggestions sent: "+response.ok);
					return response.json();
				}).then(function(result) {
					if(result == 1){
						console.log("Clearing suggestions");
						suggestions.clear();
					}
				});
			}
		});
	});
}