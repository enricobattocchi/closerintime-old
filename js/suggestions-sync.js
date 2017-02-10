self.addEventListener('sync', function(event) {
  if (event.tag == 'suggestions' || event.tag == 'test-tag-from-devtools') {
    event.waitUntil(pushSuggestionsSW());
  }
});

var suggestions;


function pushSuggestionsSW(){
	db = new Dexie("closerintime");
	db.open().then(function(db){
		suggestions = db.table('suggestions');
		suggestions.toArray()
		.then(function(data){				
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
				console.log(response.ok);
				return response.json();
			}).then(function(result) {
				if(result == 1){
					suggestions.clear();
				}
			});		
		});
	});
}