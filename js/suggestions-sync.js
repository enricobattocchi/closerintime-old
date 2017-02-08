self.addEventListener('sync', function(event) {
  if (event.tag == 'suggestions') {
    event.waitUntil(pushSuggestionsSW());
  }
});


function pushSuggestionsSW(){
	db = new Dexie("closerintime");
	
	db.suggestions
	.toArray()
	.then(function(data){
     	$.ajax({
     		method: 'post',
            url: 'suggest.php',
            data: {arr: JSON.stringify(data)},
            success: function(data, status) {
                console.log(data);
                if(data == 1){
                	db.suggestions.clear();
                }
            }
        });
	});
}