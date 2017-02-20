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
		suggestions = db.table('localevents');
		suggestions
		.filter(function(item){return (item.type == 'submitted' && item.sent != 1);})
		.toArray()
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
					console.log(result);
					if(result){
						suggestions
						.where('uuid')
						.anyOf(result)
						.modify({sent: 1})
						.then(function(){
							console.log("Suggestions marked as sent");
						});
					}
				});
			}
		});
	});
}