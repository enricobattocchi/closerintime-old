var event_ids = new Array();
var eventsengine = null;
var jsondata = new Array();
var db = null;

var settings = {
	numberevents : 2,
	showdates: 0,
	timespanformat: 0,
};


/**
 * After the page has been loaded: initializations
 */
$(function(){

	initPopover();

	initSuggestionForm();
	
	initSettings();
	initSettingsForm();

	initIndexedDB();
	
	initTypeahead();
	
	$('.chooser-cancel').on('click',function(){
		var chooser_group = $(this).closest('.input-group');
		var chooser_field = chooser_group.find('.tt-input');
		var chooser_pre = chooser_group.find('.chooser-event-pre');
		chooser_field.removeAttr('disabled');
		chooser_field.typeahead('val','');
		chooser_pre.attr('data-content', '').removeClass().addClass('chooser-event-pre');
		resetChooserButtons(chooser_field);
		event_ids[chooser_field.attr('data-index')] = null;
		updateHashFromIDS();
	});
	

	$(window).on('hashchange',function() {
		loadComparison();
	});

});


function storageAvailable(type) {
	try {
		var storage = window[type],
			x = '__storage_test__';
		storage.setItem(x, x);
		storage.removeItem(x);
		return true;
	}
	catch(e) {
		return false;
	}
}

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

/**
 * Uses the DBs to populate the JSON array used to choose the events from
 */
function initJSONdata(){
	db.events.toArray(function(array){
		jsondata = array;
	}).then(function(){
		db.localevents.toArray(function(array){
			array.forEach(function(item){
				item.id = 0-item.id;
			});
			jsondata = jsondata.concat(array);
		}).then(function(){
			$('#chooser').removeClass('transparent');
			initEventEngine();
		}).catch(function (error){
			console.error('Failed to initialise local data: '+ error);
			initEventEngine();
		});
	}).catch(function (error) {
	    console.error ("Failed to initialise data: " + error);
		showFlAlert('Failed to initialise data!','danger');
	});

}

/**
 * Reads the hash part of the URL to fill the chooser input field and start the
 * computation
 */
function loadComparison(){
	console.log("execute loadComparison");
	var hashpars = window.location.hash.substr(1);
	var chooser_events = $('#chooser input.tt-input');
	if(hashpars){
		var pars = hashpars.split('/');
		var index;
		event_ids = [];
		var command = null;
		for(index = 0; index < pars.length; index++){
			if($.isNumeric(pars[index])){
				event_ids[index] = pars[index];
			} else {
				if(typeof pars[index] == 'string'){
					command = pars[index]; 
				}
			}
		}
		if (command){
			if(command == 'cancel'){
				command = pars[index]; 
				db.localevents.clear().then(function(){
					showFlAlert('Local events cleared.','info');
					updateHashFromIDS();
				}).catch(function(error){
					console.error('Failed to clear local events: '+error);
					showFlAlert('Failed to clear local events.','warning');
					updateHashFromIDS();
				});
			}
		} else {
			db.events
			.where(':id')
			.anyOf(event_ids)
			.toArray(function(events){
				var index;
				for(index = 0; index < events.length; index++){
					var chooser_event = chooser_events.eq(index);
					setNameEtc(chooser_event, events[index], index);
				}
				computeFromIDB();
			});		
		}
	}
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
		var index = $('#chooser input[id^="chooser-"]').index(this);
		event_ids[index] = obj.id;
		setNameEtc($(this), obj, index);
		// computeFromIDB();
		updateHashFromIDS();
	})/*.on('typeahead:render', function(){
		if(!$(this).typeahead('val')){
			var index = $('#chooser input[id^="chooser-"]').index(this);
			event_ids[index] = '';
		}			
	})*/.typeahead('val', '').removeAttr('disabled');	
}


/**
 * Hides the buttons and unsets click events for a given chooser field
 * 
 * @param field
 */
function resetChooserButtons(field){
	field.closest('.input-group').find('.chooser-cancel').addClass('hide');
	field.closest('.input-group').find('.chooser-link').addClass('hide').off('click');
	field.closest('.input-group').find('.chooser-edit').removeClass('hide').removeAttr('data-id');
	field.closest('.input-group').find('.chooser-event-pre').attr('data-content', '').removeClass().addClass('chooser-event-pre');
	field.removeAttr('disabled');
}

/**
 * reads the event_ids array and updates the url with the IDs in the hash part
 */
function updateHashFromIDS(){
	console.log("execute updateHashFromIDS");
	var url = window.location.href.split('#');
	var href = url[0] + '#';
	var index;
	var hashpars = [];
	for(index = 0; index < event_ids.length; index++){
		if( event_ids[index] > 0){
			hashpars.push(event_ids[index]);
		} else if( event_ids[index] < 0){
			hashpars = {};
			break;
		}
	}
	if(hashpars.length > 0){
		href = href + hashpars.join('/');
		if( window.location.href != href ){
			window.location.href = href;
		}
	}
}


/**
 * service function for the typeahead engine lets it use only the name of the
 * event, not the year part
 * 
 * @param str
 * @returns array of tokens from the string
 */
function whitespacelesshyphen(str) {
	str = (typeof str === "undefined" || str === null) ? "" : str + "";
	str = str.split('–');
	str = str[0];
	return str ? str.split(/\s+/) : [];
}

/**
 * filters the typeahead suggestions so they don't show the already choosen
 * event
 * 
 * @param suggestions
 * @returns {Array}
 */
function filterselected(suggestions){
	var filtered = new Array();
	if(suggestions.length > 0){
		suggestions.forEach(function(item){
			if(item && event_ids.indexOf(item.id) === -1){
				filtered.push(item);
			}
		});	
	}
	return filtered;
}

/**
 * initializes the popovers
 */
function initPopover(){
	$('[data-toggle="popover"]').popover();	
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
		var numberevents = window.localStorage.getItem('numberevents');
		var showdates = window.localStorage.getItem('showdates');
		var timespanformat = window.localStorage.getItem('timespanformat');				
		
		$('input[name="numberevents"]').filter('[value="'+numberevents+'"]').closest('.btn').button('toggle');
		$('input[name="showdates"]').filter('[value="'+showdates+'"]').closest('.btn').button('toggle');
		$('input[name="timespanformat"]').filter('[value="'+timespanformat+'"]').closest('.btn').button('toggle');
		
	});
	

	$('#settings-save').on('click', function(event) {
		
		var numberevents = $('input[name="numberevents"]:checked').val();
		var showdates = $('input[name="showdates"]:checked').val();
		var timespanformat = $('input[name="timespanformat"]:checked').val();
		
		window.localStorage.setItem('numberevents', numberevents);
		window.localStorage.setItem('showdates', showdates);
		window.localStorage.setItem('timespanformat', timespanformat);
		
		initSettings();
		$('#chooser .typeahead').typeahead('destroy');
		initTypeahead();
		computeFromIDB();
		
		$('#settings').modal('hide');

	});	

}


/**
 * Sets name, link, icon, buttons for a given chooser field
 * 
 * @param field
 * @param item
 * @param index
 */
function setNameEtc(field, item, index){
	resetChooserButtons(field);
	if(item.name && item.id && index >= 0){
		var postfix = '';
		if(settings.showdates == 0){
			var year = item.year;
			if(item.year < 0){
				year = Math.abs(item.year)+ ' B.C.';
			}
			postfix = ' – '+year;
		}
		field.typeahead('val',ucfirst(item.name) + postfix);
		event_ids[index] = item.id;
		field.closest('.input-group').find('.chooser-event-pre').addClass(replaceSpaces(item.type)).attr('data-content', item.type);
		field.closest('.input-group').find('.chooser-cancel').removeClass('hide');
		if(item.link){
			field.closest('.input-group').find('.chooser-link').removeClass('hide').click(item,function(event){
				window.open(event.data.link);				
			});
		}
		if(item.id < 0  && item.type != 'submitted'){
			field.closest('.input-group').find('.chooser-edit').removeClass('hide').attr('data-id',item.id);
		} else {
			field.closest('.input-group').find('.chooser-edit').addClass('hide').removeAttr('data-id',item.id);
		}
		field.blur();
		field.attr('disabled','disabled');
	}
}

/**
 * resets all the fields of the suggestion form
 */
function resetSuggestionForm(){
	$('input[name="id"]').val('');
	$('input[name="uuid"]').val('');
	$('input[name="name"]').val('');
	$('input[name="year"]').val('');
	$('select[name="month"]').val('').attr('disabled', 'disabled');
	$('select[name="day"]').val('').attr('disabled', 'disabled');
	$('#type-personal').click();
	$('#singular').click();
	$('#type-group').removeClass('hide');
	$('#suggestions-delete').addClass('hide');
}

/**
 * submits the suggestions to the server to be included in the global list of
 * events
 * 
 * @param data
 */
function pushSuggestions(data){
	if(self.fetch) {	
		var myInit = {
				method: 'post',
				headers: {
					'Accept': 'application/json, text/plain, */*',
					'Content-Type': 'application/json'
				},
				body: encodeURI(JSON.stringify(data))
		}
	
		var myRequest = new Request('suggest.php');
	
		fetch('suggest.php',myInit).then(function(response) {
			console.log(response.ok);
			return response.json();
		}).then(function(result) {
			if(result.length > 0){
				db.localevents
				.where('uuid')
				.anyOf(result)
				.modify({sent: 1})
				.then(function(){
					showFlAlert('Event submitted.', 'success');
					resetSuggestionForm();
				}).catch(function(error){
					console.error('error submitting suggestion: ' + error);
					showFlAlert('There was an error submitting your suggestion.', 'warning');
				});
			}
		});	
	} else {
		jQuery.post( 'suggest.php',
				JSON.stringify(data),
				function(result){
					if(result.length > 0){
						db.localevents
						.where('uuid')
						.anyOf(result)
						.modify({sent: 1})
						.then(function(){
							showFlAlert('Event submitted.', 'success');
							resetSuggestionForm();
						}).catch(function(error){
							console.error('error submitting suggestion: ' + error);
							showFlAlert('There was an error submitting your suggestion.', 'warning');
						});
					}
				},
				'json' );
	}
}


/**
 * initializes the IndexedDB (using Dexie library) with data from the server
 */
/**
 * 
 */
function initIndexedDB(){
	db = new Dexie("closerintime");

	db.version(17).stores({
		events: "id, name, year, month, day, type, plural, enabled, link, uuid",
		localevents: "++id, &name, year, month, day, type, plural, sent, link, &uuid"
	});
	

	db.on('ready', function () {
		return db.events.clear()
		.catch(function(error){
			console.error('Error clearing the DB: '+error);
			showFlAlert('There was an error initialising the database.<br/>Some older browsers may be not fully supported.','danger');
		})
		.then(function(){
			console.log("Database is empty. Populating from ajax call...");
			return new Dexie.Promise(function (resolve, reject) {
				$.ajax('lookup.php', {
					type: 'get',
					dataType: 'json',
					error: function (xhr, textStatus) {
						// Rejecting promise to make db.open() fail.
						reject(textStatus);
					},
					success: function (data) {
						// Resolving Promise will launch then() below.
						jsondata = data;
						resolve();
					}
				});
			}).then(function () {
				console.log("Got ajax response. We'll now put the objects.");
				return db.events
					.bulkPut(jsondata);
			}).catch(Dexie.BulkError, function (e) {
			    console.error ("Some events not added. " + e.failures.length + " errors.");
			    showFlAlert('There was an error populating the database.<br/>Some older browsers may be not fully supported.','danger');
			}).then(function(){
				console.log("Added events");
				
				//  extract UUIDs
				var uuids = jsondata.map(function(item){
					return item.uuid;
				});	
				
				// delete local events with matching UUIDS
				return db.localevents
				.where('uuid')
				.anyOf(uuids)
				.delete();
			}).catch(function(error){
				console.error('error deleting superseded local events: ' + error);
				showFlAlert('There was an error syncing the local database.<br/>Some older browsers may be not fully supported.','warning');
			}).then(function (deleteCount) {
				if(deleteCount > 0){
					console.log( "Deleted " + deleteCount + " events");
				}
				
				// ask the server what happened to remaining submissions
				return db.localevents
				.orderBy('uuid')
				.filter(function(item){	return (item.type == 'submitted') && (item.sent == 1);	})
				.keys(function(uuids){
					var requestjson = {};
					if(uuids.length){
						
						return new Dexie.Promise(function (resolve, reject) {
							$.ajax('verify.php', {
								type: 'post',
								data: JSON.stringify(uuids),
								dataType: 'json',
								error: function (xhr, textStatus) {
									// Rejecting promise to make db.open() fail.
									reject(textStatus);
								},
								success: function (data) {
									console.log("Verification asked.");
									resolve(data);
								}
							});
						}).then(function(result) {
							console.log(result);
							
							db.transaction('rw', db.localevents, function () {
								
								if(result['to_move'] && result['to_move'].length){
									db.localevents
									.where('uuid')
									.anyOf(result['to_move'])
									.modify({type: 'personal'})
									.catch(function(error){
										console.error('error moving local events to personal list: ' + error);
									});
								}
								
								if(result['to_delete'] && result['to_delete'].length){
									db.localevents
									.where('uuid')
									.anyOf(result['to_delete'])
									.delete()
									.catch(function(error){
										console.error('error deleting substituted local events: ' + error);
									});
								}
							}).then(function(){
								showFlAlert('Local database updated','success');
								initJSONdata();
							}).catch(function(error){
								console.error('Failed transaction: '+ error.stack);
								showFlAlert('There was an error cleaning the local database.<br/>Some browsers may be not fully supported.','danger');
							});

						}).catch(function(error){
							showFlAlert('Error while querying the server for updates', 'warning');
							console.error('Failed AJAX verify: '+ error.stack);
						});
					}

				});
			}).then(function () {
				console.log ("Transaction committed");
				initJSONdata();
				loadComparison();
			}).catch(function (error){
				showFlAlert('There was an error verifying the local database. Some duplicate events could be appearing. ','warning');
				console.error('Failed filtering: '+ error.stack);
				initJSONdata();
				loadComparison();
			});
		});
	});


	db.open()
	.catch(function (error) {
		console.error(error.stack || error);
	});

}

/**
 * reads the events from the DB and starts the computation
 */
function computeFromIDB(){
	console.log("execute computeFromIDB");
	if(!$.isNumeric(event_ids[0]) || !$.isNumeric(event_ids[1])) return; // TO REVIEW

	var data = new Array();
	db.transaction('r', db.events, db.localevents, function(){
		event_ids.forEach(function(event_id, index){
			if(event_id){
				var id = event_id;
				if(event_id < 0){
					id = Math.abs(event_id);
					db.localevents.get(id).then(function(item){
						item.id = 0-item.id;
						data[index] = item;
					}).catch (function (error) {
						console.error ("Error while getting event from DB: " + error);
					});
				} else {
					db.events.get(id).then(function(item){
						data[index] = item;
					}).catch (function (error) {
						console.error ("Error while getting event from DB: " + error);
					});
				}
			}
		});
	}).then(function(result){
		populateIDB(data);
	}).catch(function(error){
		console.error('Failed transaction: '+ error.stack);
	});
}

/**
 * Compares the data and populates the diagram
 * 
 * @param data
 */
function populateIDB(data){
	if (data.length < 2) return;
	console.log("execute populateIDB");

	var header = $('#timeline-header');
	var header_h3 = $('#timeline-header h3');
	var permalink = $('#permalink');
	var sharing = $('#sharing');

	var start_date = $('#timeline-marker-start .date');
	var start_description = $('#timeline-marker-start .timeline-marker-description');
	var start_icon = $('#timeline-marker-icon-start');

	var middle = $('#timeline-marker-middle');
	var middle_date = $('#timeline-marker-middle .date');
	var middle_description = $('#timeline-marker-middle .timeline-marker-description');
	var middle_icon = $('#timeline-marker-icon-middle');
	
	var end = $('#timeline-marker-end');
	var end_date = $('#timeline-marker-end .date');
	var end_description = $('#timeline-marker-end .timeline-marker-description');
	var end_icon = $('#timeline-marker-icon-end');

	var timeline_part_one = $('#timeline-part-one');
	var timeline_part_one_label = $('#timeline-part-one .timeline-part-label');

	var timeline_part_two = $('#timeline-part-two');
	var timeline_part_two_label = $('#timeline-part-two .timeline-part-label');

	var chooser_events = $('#chooser input.tt-input');

	var result = new Array(); 
	
	for (i = 0; i < settings.numberevents; i++){
		result[i] = {}; 
	}
	
	var bol_years_only = true;

	var total_span;
	var first_span;
	var second_span;
	var percentage;

	var year = [];

	if(!data[0].month || !data[1].month || (data[2] && !data[2].month)){
		// let's use only the years
		bol_years_only = true;

		var datetime = new Array(3);

		datetime[0] = moment.utc().year(data[0].year);
		datetime[1] = moment.utc().year(data[1].year);
		if(data[2] && data[2].year){
			datetime[2] = moment.utc().year(data[2].year);
		} else {
			datetime[2] = moment.utc();
			data[2] = {
					name: 'Now'
			}
		}

		var arrays = sortArrays(datetime, data);
		
		datetime = arrays['datetime'];
		data = arrays['data'];
		event_ids = arrays['event_ids'];
		
		total_span = Math.abs(datetime[2].diff(datetime[0], 'years'));
		first_span = Math.abs(datetime[0].diff(datetime[1], 'years'));
		second_span = Math.abs(datetime[2].diff(datetime[1], 'years'));

		percentage = 100*first_span/total_span;
		
		datetime.forEach(function(date, index, datetime){
			year[index] = (date.year() < 0)? Math.abs(date.year())+' B.C.' : date.year();
		});

		year.forEach(function (year, index, years){
			result[index].date = year;
		});
		
		timeline_1 = first_span + (first_span > 1 ? " years" : " year");
		timeline_2 = second_span + (second_span > 1 ? " years" : " year");
	} else {
		bol_years_only = false;

		var datetime = new Array(2);

		datetime[0] = moment.utc().year(data[0].year).month(parseInt(data[0].month)-1).date(data[0].day).hour(12).minute(0).seconds(0);
		datetime[1] = moment.utc().year(data[1].year).month(parseInt(data[1].month)-1).date(data[1].day).hour(12).minute(0).seconds(0);
		
		if(data[2] && data[2].year){
			datetime[2] = moment.utc().year(data[2].year).month(parseInt(data[2].month)-1).date(data[2].day).hour(12).minute(0).seconds(0);
		} else {
			datetime[2] = moment.utc().hour(12).minute(0).seconds(0);
			data[2] = {
					name: 'Now'
			}
		}

		var arrays = sortArrays(datetime, data);
		
		datetime = arrays['datetime'];
		data = arrays['data'];
		event_ids = arrays['event_ids'];
		
		total_span = Math.abs(datetime[2].diff(datetime[0], 'days'));
		first_span = Math.abs(datetime[1].diff(datetime[0], 'days'));
		second_span = Math.abs(datetime[2].diff(datetime[1], 'days'));

		percentage = 100*first_span/total_span;

		datetime.forEach(function(date, index, datetime){
			year[index] = (date.year() < 0)? Math.abs(date.year())+' B.C.' : date.year();
		});

		var format = 'MMMM D';
		
		year.forEach(function (year, index, years){
			result[index].date = datetime[index].format(format)+', '+year;
		});
		
		if(settings.timespanformat == 2){
			timeline_1 = moment.preciseDiff(datetime[1], datetime[0]);
			timeline_2 = moment.preciseDiff(datetime[2], datetime[1]);
		} else if(settings.timespanformat == 1){
			first_span = Math.abs(datetime[1].diff(datetime[0], 'years'));
			second_span = Math.abs(datetime[2].diff(datetime[1], 'years'));
			timeline_1 = first_span + (first_span > 1 ? " years" : " year");
			timeline_2 = second_span + (second_span > 1 ? " years" : " year");	
		} else {
			timeline_1 = first_span + (first_span > 1 ? " days" : " day");
			timeline_2 = second_span + (second_span > 1 ? " days" : " day");
		}
	}

	data.forEach(function(datum, index, data){
		if(datum){
			result[index].id = datum.id;
			result[index].description = ucfirst(datum.name);
			result[index].category_icon = datum.type;
			result[index].link = datum.link;
		}
	});
	
	result[0].size = percentage+"%";
	
	result[1].size = (100-percentage)+"%";
	result[1].verb = (data[1].plural == 1)? 'are' : 'is' ;

	var second_term_of_comparison = data[0].name;
	var third_term_of_comparison = 'us';
	if(data[2]){
		third_term_of_comparison = data[2].name;
	}

	if(percentage > 50){
		header = result[1].description+" "+result[1].verb+" closer in time to "+third_term_of_comparison+" than to "+second_term_of_comparison+".";
		title = result[1].description+" "+result[1].verb+" #closerintime to "+third_term_of_comparison+" than to "+second_term_of_comparison+".";
	} else if(percentage < 50){
		header = result[1].description+" "+result[1].verb+" closer in time to "+second_term_of_comparison+" than to "+third_term_of_comparison+".";
		title = result[1].description+" "+result[1].verb+" #closerintime to "+second_term_of_comparison+" than to "+third_term_of_comparison+".";
	} else {
		header = result[1].description+" "+result[1].verb+" exactly halfway between "+second_term_of_comparison+" and "+third_term_of_comparison+".";
		title = result[1].description+" "+result[1].verb+" is exactly halfway between "+second_term_of_comparison+" and "+third_term_of_comparison+". #closerintime";
	}

	header_h3.html(header);
	document.title = title;
	var url = window.location.href.split('#');
	var index;
	var hashpars = [];
	for(index = 0; index < event_ids.length; index++){
		if( result[index].id > 0){
			hashpars.push(result[index].id);
		} else {
			haspars = {};
			break;
		}
	}
	if(hashpars.length > 0){
		permalink.attr('href', '#'+hashpars.join('/'));
		url = url[0] + '#'+hashpars.join('/');
	} else {
		permalink.attr('href', '#');
		url = url[0];
	}
	
	sharing.html('<a id="twitter-share-button" target="_blank" href="https://twitter.com/intent/tweet?text='+encodeURIComponent(title)+'&url='+encodeURIComponent(url)+'" result-size="large"><i class="fa fa-twitter"></i> Tweet</a>');

	start_date.html(result[0].date);
	start_description.html(result[0].description);

	middle_date.html(result[1].date);
	middle_description.html(result[1].description);

	end_date.html(result[2].date);
	end_description.html(result[2].description);

	timeline_part_one_label.html(timeline_1);
	timeline_part_two_label.html(timeline_2);

	timeline_part_one.width(result[0].size);
	timeline_part_two.width(result[1].size);
	middle.css('left', result[0].size);

	start_icon.removeClass().addClass('timeline-marker-icon '+replaceSpaces(result[0].category_icon));
	middle_icon.removeClass().addClass('timeline-marker-icon '+replaceSpaces(result[1].category_icon));
	end_icon.removeClass().addClass('timeline-marker-icon '+replaceSpaces(result[2].category_icon));

	chooser_events.each(function(index, chooser_event){
		if(chooser_events.eq(index).typeahead('val') !== result[index].description){
			var item = {};
			item.id = result[index].id;
			item.name = result[index].description;
			item.year = year[index];
			item.type = result[index].category_icon;
			item.link = result[index].link;
			setNameEtc(chooser_events.eq(index), item, 1);	
		}
	});
	
}

function sortArrays(datetime, data){
	// temporary array holds objects with position and sort-value
	var mapped = datetime.map(function(el, i) {
	  return { index: i, value: el };
	})

	// sorting the mapped array containing the reduced values
	mapped.sort(function(a, b) {
	  if (a.value.isBefore(b.value)){
		  return -1;
	  } else if(b.value.isBefore(a.value)){
		  return 1;
	  } else {
		  return 0;
	  }
	});

	var result = [];

	result['datetime'] = mapped.map(function(el){
		return datetime[el.index];
	});
	
	result['data'] = mapped.map(function(el){
		return data[el.index];
	});

	result['event_ids'] = mapped.map(function(el){
		return event_ids[el.index];
	});

	
	return result;
}

/**
 * Uncapitalizes the first letter of a string
 * 
 * @param str
 * @returns
 */
function lcfirst (str) {
	str += '';
	var f = str.charAt(0)
	.toLowerCase();
	return f + str.substr(1);
}

/**
 * Capitalizes the first letter of a string
 * 
 * @param str
 * @returns
 */
function ucfirst (str) {
	str += '';
	var f = str.charAt(0)
	.toUpperCase();
	return f + str.substr(1);
}

/**
 * generates a UUID (v4)
 * 
 * @returns a string containing the UUID
 */
function generateUUID() {
	var d = new Date().getTime();
	var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = (d + Math.random()*16)%16 | 0;
		d = Math.floor(d/16);
		return (c=='x' ? r : (r&0x3|0x8)).toString(16);
	});
	return uuid;
};


/**
 * Shows a floating alert
 * 
 * @param message
 * @param alert
 */
function showFlAlert(message, alert, timeout) {
	if(!timeout){
		timeout = 4000;
	}
	var rand = moment().unix();
	$('<div id="flalert-'+rand+'" class="alert alert-' + alert + ' fade in">\
			<button type="button" class="close" data-dismiss="alert" aria-hidden="true">×</button>'
			+ message + '&nbsp;&nbsp;</div>').appendTo('#floating_alert');

	setTimeout(function () {
		$(".alert").alert('close');
	}, timeout);
}


/**
 * Converts "a string" to "a-string" (useful for CSS classes)
 * 
 * @param string
 * @returns
 */
function replaceSpaces(string){
	if(string)
		return string.split(' ').join('-');
	else
		return string;
}
