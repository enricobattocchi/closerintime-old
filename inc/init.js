/**
 * After the page has been loaded: initializations
 */
$(function(){

	initIndexedDB();
	
	initTypeahead();

	$(document).on('click', '#clipboard-share-button', function(event){
		copyToClipboard();
		event.preventDefault();
		return false;
	});
	
	$(document).on('click', '.timeline-marker-icon[id!=timeline-marker-icon-now] ', function(event){
		removeEventMarker($(this).closest('.timeline-marker'));
	});
	
	initMarkers();
	
	initPopover();

	initSuggestionForm();
	
	initSettings();
	initSettingsForm();

});

function initSettings(){
	if (storageAvailable('localStorage')) {
		settings.numberevents = window.localStorage.getItem('numberevents') ? window.localStorage.getItem('numberevents') : 2;
		settings.showdates = window.localStorage.getItem('showdates') ? window.localStorage.getItem('showdates') : 0;
		settings.timespanformat = window.localStorage.getItem('timespanformat') ? window.localStorage.getItem('timespanformat') : 0;
	}
	else {
		$('#opensettings').addClass('hide');
	}
}

function initMarkers(){
	var now_marker = $('#timeline-marker-now');
	addDateToMarker(now_marker);
}


/**
 * initializes the event search engine
 */
function initEventEngine(){
	eventsengine = new Bloodhound({
		datumTokenizer: function(d) {
			var datumstrings = Bloodhound.tokenizers.whitespace(d.name.replace('"','')+' '+d.year+' '+d.type);
			datumstrings.push(d.name);
			return datumstrings;
		},
		queryTokenizer:function(query) {
			var querystrings = whitespacelesshyphen(query);
			return querystrings;
		}, 
		sorter: function() {
			  return .5 - Math.random();
		},
		local: jsondata
	});
}


/**
 * initializes the typeahead fields
 */
function initTypeahead(){
	initEventEngine();

	$('#chooser .typeahead').typeahead({
		minLength: 0,
	}, {
		name: 'eventsengine',
		/* display: 'name', */
		display: function(data){
        	var postfix = '';
        	if(settings.showdates == 0){
        		var year = data.year;
        		if(data.year < 0){
        			year = Math.abs(data.year)+ ' B.C.';
        		}
        		postfix = ' – '+year;
        	}
			return data.name+postfix;
		},
		limit: 7,
		source: function(query, syncResults){
			if(query == ''){
				var rand_array = [];
				var local = eventsengine.local;
				var i;
				for(i = 0; i < 10; i++){
					var item = local.splice(Math.floor(Math.random()*local.length), 1);
					rand_array.push(item[0]);
				}
				syncResults(filterselected(rand_array));				
			} else {
				eventsengine.search(query,function(suggestions){
					syncResults(filterselected(suggestions));
				});
			}
		},
		templates: {
			notFound: [
			           '<div class="empty-message">',
			           '<i class="fa fa-exclamation-triangle"></i> Unable to find any matches. <a href="" data-toggle="modal" data-target="#suggest">Want to add an event?</a>',
			           '</div>'
			           ].join('\n'),
			           footer: [
			                    '<div class="empty-message">',
			                    '<i class="fa fa-pencil"></i> <a href="" data-toggle="modal" data-target="#suggest">Add an event</a>',
			                    '</div>'
			                    ].join('\n'),
			                    suggestion: function(data){
			                    	var postfix = '';
			                    	if(settings.showdates == 0){
			                    		var year = data.year;
			                    		if(data.year < 0){
			                    			year = Math.abs(data.year)+ ' B.C.';
			                    		}
			                    		postfix = ' – '+year;
			                    	}
			                    	return '<div><i class="fa '+replaceSpaces(data.type)+'"></i> <strong>'+ucfirst(data.name)+'</strong>'+postfix+'</div>';}
		}
	}).on('typeahead:select', function(e, obj){
		$(this).blur();
		insertEventObj(obj);
		$(this).typeahead('val', '%').typeahead('val', '');
	}).typeahead('val', '').removeAttr('disabled');	
}

/**
 * initalizes the suggestion form
 */
function initSuggestionForm(){

	resetSuggestionForm();

	$('#suggest').on('show.bs.modal', function (event) {
		var modal = $(this);
		var origin = $(event.relatedTarget); // what user clicked to show the
		// modal

		// if the edit button was used
		var id = parseInt(origin.attr('data-id'));
		var frominput = parseInt(origin.attr('data-frominput'));

		var input = null;
		if(frominput !== 0 || frominput !== 1 ){ // if the link in suggestions was used
			input = origin.closest('.input-group').find('input[id^="chooser-"]'); // get the input
			frominput = $('#chooser input[id^="chooser-"]').index(input); // get the input
		}		
		modal.find('input[name="frominput"]').val(frominput);
		if(id < 0){
			id = Math.abs(id); 
		}
		if( id ){
			modal.find('input[name="id"]').val(id); // positive id
			db.localevents.get(id).then(function(item){
				$('input[name="uuid"]').val(item.uuid);
				$('input[name="name"]').val(item.name);
				$('input[name="year"]').val(item.year).change();
				$('select[name="month"]').val(item.month).change();
				$('select[name="day"]').val(item.day);
				$('input[name="plural[]"]').filter('[value="'+item.plural+'"]').closest('.btn').button('toggle');
				$('#suggestions-delete').removeClass('hide');
				$('#type-group').addClass('hide');
			}).catch(function(error){
				console.error('Could not retrieve the event: ' + error);
				event.stopPropagation();
			});
		}
	}).on('hidden.bs.modal',function (event){
		resetSuggestionForm();
	});


	$('#suggestions-delete').on('click', function(event) {
		if($('input[name="id"]').val()){
			var id = parseInt($('input[name="id"]').val());
			var frominput = parseInt($('input[name="frominput"]').val());
			db.localevents.delete(id).then(function(){
				id = 0-id; // to negative id
				jsondata = jsondata.filter(function(obj){ return id !== parseInt(obj.id); });
				initEventEngine();
				$('#chooser input[id^="chooser-"]').eq(frominput).typeahead('val','');
				resetChooserButtons($('#chooser input[id^="chooser-"]').eq(frominput));
				showFlAlert('Event deleted.', 'success');
			}).catch(function(error){
				console.error('Error deleting object: ' + error);
				showFlAlert('There was a problem deleting the event.', 'warning');
			});
		}
		$('#suggest').modal('hide');
	});


	$('#suggestions-save').on('click', function(event) {
		var $form = $(this);
		var frominput = parseInt($('input[name="frominput"]').val());

		if($('input[name="name"]').val() && $('input[name="year"]').val()){

			$form.serialize();
			var item = {};
			var id = null;
			if($('input[name="id"]').val()){
				id = parseInt($('input[name="id"]').val()); // positive id
			} else {
				item.uuid = generateUUID();
			}
			item.name = $('input[name="name"]').val();
			item.year = $('input[name="year"]').val();
			item.month = $('select[name="month"]').val();
			item.day = $('select[name="day"]').val();
			item.plural = $('input[name="plural[]"]:checked').val();
			// item.capitalize_first = 0;
			item.type = $('input[name="type"]:checked').val();

			if(id){
				db.localevents.update(id, item).then(function(updated){
					if (updated){
						console.log ("Item updated");
						item.id = 0-id; // to negative id
						jsondata = jsondata.filter(function(obj){ return item.id !== parseInt(obj.id); });
						jsondata.push(item);
						initEventEngine();
						showFlAlert('Event updated.', 'success');
						setNameEtc($('#chooser input[id^="chooser-"]').eq(frominput), item, frominput);
						event_ids[frominput] = item.id;
						computeFromIDB();
					} else {
						console.log ("Nothing was updated");
					}
				});
			} else {
				db.localevents.add(item).then(function(newid){
					console.log ("Item added");
					item.id = 0-newid; // to negative id
					jsondata.push(item);
					initEventEngine();	            		
					showFlAlert('Event stored.', 'success');

					if (navigator.serviceWorker) {
						navigator.serviceWorker.ready.then(function(reg){    
							if (reg.sync && reg.sync.getTags) {
								reg.sync.register('suggestions');
							}
							else {
								reg.active.postMessage('pushSuggestions');
							}                
						});
					} else {
						if(item.type == 'submitted'){
							pushSuggestions(item);
						}
					}            		
					setNameEtc($('#chooser input[id^="chooser-"]').eq(frominput), item, frominput);
					event_ids[frominput] = item.id;
					computeFromIDB();
				}).catch(function(error){
					console.error('Error adding local item: '+error);
					showFlAlert('There was a problem adding your event.', 'warning');
				});    

			}

			$('#suggest').modal('hide');
		} else {
			showFlAlert('You must fill at least the event name and year.', 'warning');
		}

		event.preventDefault();

	});	


	$('input[name="year"]').on('change keyup paste', function(){
		if(parseInt($(this).val()) === 0){
			$(this).val(-1);
		}
		
		if(parseInt($(this).val()) < -10000){
			$(this).val(-10000);
		}

		if(parseInt($(this).val()) >= moment.utc().year()){
			$(this).val(moment.utc().subtract(1, 'years').year());
		}
		
		if($(this).val()){
			$('select[name="month"]').removeAttr('disabled').val('').change();
		} else {
			$('select[name="month"]').val('').attr('disabled','disabled');
			$('select[name="day"]').val('').attr('disabled','disabled');
		}
	});

	$('select[name="month"]').change(function(){
		var $day = $('select[name="day"]');
		var month = $(this).val();
		if(!month){
			$day.val('').attr('disabled','disabled');
		} else {
			var year = $('input[name="year"]').val();
			var days_in_month = moment().year(year).month(month-1).daysInMonth();
			$day.removeAttr('disabled').find('option').each(function(index, option){
				if( $(option).attr('value') == '' || $(option).attr('value') > days_in_month){
					$(option).attr('disabled', 'disabled');
				}
			});
		}
	});
}


function initSettingsForm(){
	
	$('#settings').on('show.bs.modal', function (event) {
		
		var showdates = window.localStorage.getItem('showdates');
		var timespanformat = window.localStorage.getItem('timespanformat');
		
		$('input[name="showdates"]').filter('[value="'+showdates+'"]').closest('.btn').button('toggle');
		$('input[name="timespanformat"]').filter('[value="'+timespanformat+'"]').closest('.btn').button('toggle');
		
	});
	

	$('#settings-save').on('click', function(event) {
		
		var showdates = $('input[name="showdates"]:checked').val();
		var timespanformat = $('input[name="timespanformat"]:checked').val();
		
		window.localStorage.setItem('showdates', showdates);
		window.localStorage.setItem('timespanformat', timespanformat);
		
		initSettings();
		$('#chooser .typeahead').typeahead('destroy');
		initTypeahead();
		checkTimespanLengths();
		$('#settings').modal('hide');

	});	

}