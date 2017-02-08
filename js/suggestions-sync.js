self.addEventListener('sync', function(event) {
  if (event.tag == 'suggestions') {
    event.waitUntil(function(){
    	console.log("Performing a background sync");
    	pushSuggestions();    		
    });
  }
});
