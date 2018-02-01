var event_ids = new Array();
var event_objs = new Array();
var eventsengine = null;
var jsondata = new Array();
var db = null;
var events_with_just_year = 0;

var settings = {
	numberevents : 2,
	showdates: 0,
	timespanformat: 0, //0: days; 1: years; 2: years, months, days;
};
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
 * initializes the IndexedDB (using Dexie library) with data from the server
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
				$.ajax('/lookup.php', {
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
						event_objs[index] = item;
					}).catch (function (error) {
						console.error ("Error while getting event from DB: " + error);
					});
				} else {
					db.events.get(id).then(function(item){
						data[index] = item;
						event_objs[index] = item;
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
	
	$(document).on('click', '#edit-share-button', function(event){
		editTimelineHeader();
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
/**
 * Reads the hash part of the URL to start the computation
 */
function loadComparison(){
	console.log("execute loadComparison");
	var hashpars = window.location.pathname.substr(1);
	var chooser_events = $('#chooser input.tt-input');
	if(hashpars){
		var pars = hashpars.split('/');
		event_ids = [];
		pars.forEach(function(par){
			if($.isNumeric(par)){
				pushUnique(event_ids,par);
			}
		});
		computeFromIDB();
	}
}


/**
 * reads the event_ids array and updates the url with the IDs in the hash part
 */
function updateHashFromIDS(){
	console.log("execute updateHashFromIDS");
		
	var stateObj = { ids : event_ids };
	var path = "";
	event_ids.forEach(function(event_id){
		path = path + '/' + event_id;
	});
	path = path.substr(1);
	var url = window.location.origin+'/'+path;
	history.pushState(stateObj, path, url );
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
 * Compares the data and populates the diagram
 * 
 * @param data
 */
function populateIDBOLD(data){
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

	var result = {};
	result.start = {};
	result.middle = {};
	result.end = {};
	var bol_years_only = true;

	var total_span;
	var first_span;
	var second_span;
	var percentage;

	var year_0;
	var year_1;
	var year_2;
	var year = array();

	if(!data[0].month || !data[1].month || (data[2] && !data[2].month)){
		// let's use only the years
		bol_years_only = true;

		var datetime = new Array(3);

		datetime[0] = moment.utc().year(data[0].year);

		datetime[1] = moment.utc().year(data[1].year);
		
		if(data[2]){
			datetime[2] = moment.utc().year(data[2].year);
		} else {
			datetime[2] = moment.utc();
		}

		// reverse order if first event is more recent
		if(datetime[1].isBefore(datetime[0])){
			data.reverse();
			datetime.reverse();
			event_ids.reverse();
		}

		total_span = Math.abs(datenow.diff(datetime[0], 'years'));
		first_span = Math.abs(datetime[0].diff(datetime[1], 'years'));
		second_span = Math.abs(datenow.diff(datetime[1], 'years'));

		percentage = 100*first_span/total_span;

		year_0 = (datetime[0].year() < 0)? Math.abs(datetime[0].year())+' B.C.' : datetime[0].year();
		year_1 = (datetime[1].year() < 0)? Math.abs(datetime[1].year())+' B.C.' : datetime[1].year();

		result.start.date = year_0;
		result.middle.date = year_1;
		result.now_date = datenow.year();

		result.timeline_1 = first_span + (first_span > 1 ? " years" : " year");
		result.timeline_2 = second_span + (second_span > 1 ? " years" : " year");
	} else {
		bol_years_only = false;

		var datetime = new Array(2);

		datetime[0] = moment.utc().year(data[0].year).month(parseInt(data[0].month)-1).date(data[0].day).hour(12).minute(0).seconds(0);

		datetime[1] = moment.utc().year(data[1].year).month(parseInt(data[1].month)-1).date(data[1].day).hour(12).minute(0).seconds(0);

		// reverse order if first event is more recent
		if(datetime[1].isBefore(datetime[0])){
			data.reverse();
			datetime.reverse();
			event_ids.reverse();
		}

		
		total_span = Math.abs(datenow.diff(datetime[0], 'days'));
		first_span = Math.abs(datetime[1].diff(datetime[0], 'days'));
		second_span = Math.abs(datenow.diff(datetime[1], 'days'));

		percentage = 100*first_span/total_span;

		year_0 = (datetime[0].year() < 0)? Math.abs(datetime[0].year())+' B.C.' : datetime[0].year();
		year_1 = (datetime[1].year() < 0)? Math.abs(datetime[1].year())+' B.C.' : datetime[1].year();

		var format = 'MMMM D';

		result.start.date = datetime[0].format(format)+', '+year_0;
		result.middle.date = datetime[1].format(format)+', '+year_1;
		result.now_date = datenow.format(format+', Y');

		if(settings.timespanformat == 2){
			result.timeline_1 = moment.preciseDiff(datetime[1], datetime[0]);
			result.timeline_2 = moment.preciseDiff(datenow, datetime[1]);
		} else if(settings.timespanformat == 1){
			first_span = Math.abs(datetime[1].diff(datetime[0], 'years'));
			second_span = Math.abs(datenow.diff(datetime[1], 'years'));
			result.timeline_1 = first_span + (first_span > 1 ? " years" : " year");
			result.timeline_2 = second_span + (second_span > 1 ? " years" : " year");	
		} else {
			result.timeline_1 = first_span + (first_span > 1 ? " days" : " day");
			result.timeline_2 = second_span + (second_span > 1 ? " days" : " day");
		}
	}

	result.start.id = data[0].id;
	result.start.description = ucfirst(data[0].name);
	result.start.category_icon = data[0].type;
	result.start.size = percentage+"%";
	result.start.link = data[0].link;

	result.middle.id = data[1].id;
	result.middle.description = ucfirst(data[1].name);
	result.middle.category_icon = data[1].type;
	result.middle.size = (100-percentage)+"%";
	result.middle.verb = (data[1].plural == 1)? 'are' : 'is' ;
	result.middle.link = data[1].link;

	var second_term_of_comparison = data[0].name;

	if(percentage > 50){
		result.header = result.middle.description+" "+result.middle.verb+" closer in time to us than to "+second_term_of_comparison+".";
		result.title = result.middle.description+" "+result.middle.verb+" #closerintime to us than to "+second_term_of_comparison+".";
	} else if(percentage < 50){
		result.header = result.middle.description+" "+result.middle.verb+" closer in time to "+second_term_of_comparison+" than to us.";
		result.title = result.middle.description+" "+result.middle.verb+" #closerintime to "+second_term_of_comparison+" than to us.";
	} else {
		result.header = result.middle.description+" "+result.middle.verb+" exactly halfway between "+second_term_of_comparison+" and us.";
		result.title = result.middle.description+" "+result.middle.verb+" exactly halfway between "+second_term_of_comparison+" and us. #closerintime";
	}

	header_h3.html(result.header);
	document.title = result.title;
	var url = window.location.origin;
	if(result.start.id>0 && result.middle.id>0){
		permalink.attr('href', '/'+result.start.id+'/'+result.middle.id);
		url = url + '/'+result.start.id+'/'+result.middle.id;
	} else {
		permalink.attr('href', '/');
		url = url;
	}
	var sharing_html = null;
	sharing_html = '<a id="twitter-share-button" target="_blank" href="https://twitter.com/intent/tweet?text='+encodeURIComponent(result.title)+'&url='+encodeURIComponent(url)+'" result-size="large"><i class="fa fa-twitter"></i> Tweet</a>';
	if(result.start.id>0 && result.middle.id>0){
			sharing_html = sharing_html + '<a id="facebook-share-button" target="_blank" href="https://www.facebook.com/dialog/share?app_id=1012298692240693&href='+encodeURIComponent(url)+'&hashtag=%23closerintime"><i class="fa fa-facebook"></i> Share</a>';
	} else  {
		sharing_html = sharing_html + '<a id="facebook-share-button" target="_blank" href="https://www.facebook.com/dialog/share?app_id=1012298692240693&href='+encodeURIComponent(url)+'&hashtag=%23closerintime&quote='+encodeURIComponent(result.title)+'"><i class="fa fa-facebook"></i> Share</a>';
	}
	sharing_html = sharing_html + '<a id="clipboard-share-button" href="'+url+'"><i class="fa fa-clipboard"></i> Copy</a>';
		
	sharing.html(sharing_html);

	start_date.html(result.start.date);
	start_description.html(result.start.description);

	middle_date.html(result.middle.date);
	middle_description.html(result.middle.description);

	end_date.html(result.now_date);

	timeline_part_one_label.html(result.timeline_1);
	timeline_part_two_label.html(result.timeline_2);

	timeline_part_one.width(result.start.size);
	timeline_part_two.width(result.middle.size);
	middle.css('left', result.start.size);

	start_icon.removeClass().addClass('timeline-marker-icon '+replaceSpaces(result.start.category_icon));
	middle_icon.removeClass().addClass('timeline-marker-icon '+replaceSpaces(result.middle.category_icon));

	if(chooser_event_one.typeahead('val') !== result.start.description){
		var item = {};
		item.id = result.start.id;
		item.name = result.start.description;
		item.year = year_0;
		item.type = result.start.category_icon;
		item.link = result.start.link;
		setNameEtc(chooser_event_one, item, 0);		
	}
	if(chooser_event_two.typeahead('val') !== result.middle.description){
		var item = {};
		item.id = result.middle.id;
		item.name = result.middle.description;
		item.year = year_1;
		item.type = result.middle.category_icon;
		item.link = result.middle.link;
		setNameEtc(chooser_event_two, item, 1);	
	}
}


function populateIDB(data){
	console.log("execute populateIDB");
	
	data.forEach(function(obj){
		insertEventObj(obj);
	});
	
}

function insertEventObj(obj){
	var new_marker = $('#template .timeline-marker').clone();
	var marker_description = new_marker.find('.timeline-marker-description');
	var marker_icon = new_marker.find('.timeline-marker-icon');
	
	var new_timeline_part = $('#template .timeline-part').clone();
	
	if(obj.link){
		marker_description.html('<a href="'+obj.link+'" rel="external" target="_blank">'+ucfirst(obj.name)+'</a>');
	} else {
		marker_description.html(ucfirst(obj.name));
	}
	marker_icon.addClass(replaceSpaces(obj.type));
	
	addDateToMarker(new_marker, obj);
	
	var next_marker = findNextMarker(new_marker);	
	
	new_timeline_part.css('flex-grow', 0);
	
	new_timeline_part.insertBefore(next_marker);
	new_marker.insertBefore(new_timeline_part);
	
	pushUnique(event_ids, obj.id);
	updateHashFromIDS();
	
	var prev_timeline_part = new_marker.prev('.timeline-part');
	var new_timespan = calculateTimespanFromMarkers(new_timeline_part);
		
	setTimeout(() => {
		new_timeline_part.css('flex-grow', new_timespan);
		checkTimespanLengths();
		
	}, 200);
}

function removeEventMarker(marker){
	
	var timeline_part = marker.next('.timeline-part');
	var marker_next = timeline_part.next('.timeline-marker');
	var marker_id = marker.attr('data-id');
	var prev_timeline_part = marker.prev('.timeline-part');
	
	timeline_part.css('flex-grow', 0);
	if(prev_timeline_part.length){
		var timespan = calculateTimespanFromMarkers(prev_timeline_part, marker_next);
		prev_timeline_part.css('flex-grow', timespan);
	}
	
	if (!marker.attr('data-month')){
		events_with_just_year--;
	}
	
	setTimeout(() => {
		timeline_part.remove();
		
		event_ids = remove(event_ids, marker_id);
		updateHashFromIDS();
		
		marker.remove();
		checkTimespanLengths();
	}, 1500);
}

function findNextMarker(marker){
	var timeline = $('#timeline');
	var year = marker.attr('data-year');
	
	var next_marker = null;
	
	timeline.find('.timeline-marker').each(function(index){
		next_marker = $(this);
		next_year = next_marker.attr('data-year');
		
		if(parseInt(next_year) >= parseInt(year)){
			return false;
		} else {
			return true;
		}
	});
	
	return next_marker;
}

function calculateTimespanFromMarkers(timeline_part, marker_next){
	var timeline = $('#timeline');
	var marker_prev = timeline_part.prev('.timeline-marker');
	if(!marker_next || !marker_next.length){
		marker_next = timeline_part.next('.timeline-marker');
	}
	var datetime = [];
	var timeline_label = timeline_part.find('.timeline-part-label');
	
	if(marker_prev.length && marker_next.length){
		datetime[0] = moment(marker_prev.attr('data-date')).utc().hour(12).minute(0).seconds(0).millisecond(0);
		datetime[1] = moment(marker_next.attr('data-date')).utc().hour(12).minute(0).seconds(0).millisecond(0);
		
		timespan = Math.abs(datetime[0].diff(datetime[1], 'days'));
		
		if(events_with_just_year > 0){
			timeline.addClass('just-years');
			var datetime_years = [];
			datetime_years[0] = moment().utc().hour(12).minute(0).seconds(0).millisecond(0);
			datetime_years[1] = datetime_years[0].clone();
			datetime_years[0].year(marker_prev.attr('data-year'));
			datetime_years[1].year(marker_next.attr('data-year'));
			timespan_for_label = Math.abs(datetime_years[0].diff(datetime_years[1], 'years'));
			timeline_label.html(timespan_for_label + (timespan > 1 ? " years" : "year"));
			timespan = Math.abs(datetime_years[0].diff(datetime_years[1], 'years'));
		} else if(settings.timespanformat == 1 || events_with_just_year > 0){
			timeline.removeClass('just-years');
			var datetime_years = [];
			datetime_years[0] = moment().utc().hour(12).minute(0).seconds(0).millisecond(0);
			datetime_years[1] = datetime_years[0].clone();
			datetime_years[0].year(marker_prev.attr('data-year'));
			datetime_years[1].year(marker_next.attr('data-year'));
			timespan_for_label = Math.abs(datetime_years[0].diff(datetime_years[1], 'years'));
			timeline_label.html(timespan_for_label + (timespan > 1 ? " years" : "year"));
		} else if(settings.timespanformat == 0){
			timeline.removeClass('just-years');
			timeline_label.html(timespan + (timespan > 1 ? " days" : " day"));
		} else if(settings.timespanformat == 2){
			timeline.removeClass('just-years');
			timeline_label.html(moment.preciseDiff(datetime[0], datetime[1]));
		}
		
		return timespan;
	}
	
	return 0;
}

function checkTimespanLengths(){
	var timeline_parts = $('#timeline .timeline-part');
	
	timeline_parts.each(function(){
		var timespan = calculateTimespanFromMarkers($(this));
		$(this).css('flex-grow', timespan);
		$(this).attr('data-timespan', timespan);
	})
	
	buildTimelineSentence();
}

function buildTimelineSentence(){
	setTimelineHeader();
	
	var header_h3 = $('#timeline-header h3');
	var sharing = $('#sharing');
	var timespans = $('#timeline .timeline-part');
	var result = {};
	result.start = {};
	result.middle = {};
	
	var timespan_lengths = [];
	timespans.each(function(index, element){
		timespan_lengths[index] = $(this).attr('data-timespan');
	});

	var markers = $('#timeline .timeline-marker');
	
	var marker_start = markers.eq(0);
	result.start.id = marker_start.attr('data-id');
	result.start.description = ucfirst(marker_start.attr('data-name'));
	
	var second_term_of_comparison = marker_start.attr('data-name');
	
	if(event_ids.length == 1){
		var time_passed = timespans.eq(0).find('.timeline-part-label').text();
		
		result.header = time_passed + ' ago: ' + second_term_of_comparison + ".";
		result.title = time_passed + ' ago: ' + second_term_of_comparison + ". #closerintime";
		
		var url = window.location.origin;
		var permalink = "";
		if(result.start.id > 0){
			permalink = '/'+result.start.id;
			url = url + '/'+result.start.id;
			var quote = null;
		} else {
			permalink = '/';
			url = url;
			var quote = result.title;
		}
		
		setTimelineHeader(result.header, result.title, permalink, url, quote);
		
	} else if(event_ids.length == 2){
		var marker_middle = markers.eq(1);
		result.middle.id = marker_middle.attr('data-id');
		result.middle.description = ucfirst(marker_middle.attr('data-name'));
		result.middle.verb = (marker_middle.attr('data-plural') == 1)? 'are' : 'is' ;
		
		var percentage = (timespan_lengths[0]/timespan_lengths[1])*100;
		
		if(percentage > 100){
			result.header = result.middle.description+" "+result.middle.verb+" closer in time to us than to "+second_term_of_comparison+".";
			result.title = result.middle.description+" "+result.middle.verb+" #closerintime to us than to "+second_term_of_comparison+".";
		} else if(percentage < 100){
			result.header = result.middle.description+" "+result.middle.verb+" closer in time to "+second_term_of_comparison+" than to us.";
			result.title = result.middle.description+" "+result.middle.verb+" #closerintime to "+second_term_of_comparison+" than to us.";
		} else {
			result.header = result.middle.description+" "+result.middle.verb+" exactly halfway between "+second_term_of_comparison+" and us.";
			result.title = result.middle.description+" "+result.middle.verb+" exactly halfway between "+second_term_of_comparison+" and us. #closerintime";
		}
	
		
		var url = window.location.origin;
		if(result.start.id>0 && result.middle.id>0){
			permalink = '/'+result.start.id+'/'+result.middle.id;
			url = url + '/'+result.start.id+'/'+result.middle.id;
			var quote = null;
		} else {
			permalink = '/';
			url = url;
			var quote = result.title;
		}
		
		setTimelineHeader(result.header, result.title, permalink, url, quote);
	}
}

function copyToClipboard(){

	var textArea = document.createElement("textarea");
	textArea.style.position = 'fixed';
	textArea.style.top = 0;
	textArea.style.left = 0;
	textArea.style.width = '2em';
	textArea.style.height = '2em';
	textArea.style.padding = 0;
	textArea.style.border = 'none';
	textArea.style.outline = 'none';
	textArea.style.boxShadow = 'none';
	
	textArea.style.background = 'transparent';
	textArea.value = $('#permalink h3').text()+' '+$('#clipboard-share-button').attr('href');
	
	document.body.appendChild(textArea);
	
	textArea.select();
	
	try {
		var successful = document.execCommand('copy');
		var msg = successful ? 'successful' : 'unsuccessful';
		console.log('Copying text command was ' + msg);
		if( successful ) {
			showFlAlert('Copied to clipboard', 'info');
		} else {
			throw "Something was wrong with copying";
		}
	} catch (err) {
		console.log('Oops, unable to copy');
		showFlAlert('Text was not copied', 'warning');
	}
	
	document.body.removeChild(textArea);	
}

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
	return string.split(' ').join('-');
}

function addDateToMarker(marker, obj){
	
	if(obj && obj.year){
		marker.attr('data-id', obj.id);
		marker.attr('data-plural', obj.plural);
		marker.attr('data-name', obj.name);
		var year = obj.year;
		var month = obj.month;
		var day = obj.day;
	} else {
		var datenow = moment.utc().hour(12).minute(0).seconds(0);
		var year = datenow.year();
		var month = datenow.month() + 1;
		var day = datenow.date();
	}
	
	marker.attr('data-year', year);
	if(month){
		marker.attr('data-month', month);
	}
	if(day){
		marker.attr('data-day', day);
	}
	year_label = (year < 0)? Math.abs(year)+' B.C.' : year;
	if(!day){
		if(!month){
			var date = moment.utc().year(year).hour(12).minute(0).seconds(0);
			marker.find('.date').html(year_label);
			events_with_just_year++;
		} else {
			var date = moment.utc().year(year).month(month-1).hour(12).minute(0).seconds(0);
			var format = 'MMMM';

			marker_date_label = date.format(format)+' '+year_label;
			marker.find('.date').html(marker_date_label);
		} 
	} else {
		var date = moment.utc().year(year).month(month-1).date(day).hour(12).minute(0).seconds(0);
		var format = 'MMMM D';

		marker_date_label = date.format(format)+', '+year_label;
		marker.find('.date').html(marker_date_label);
	}
	marker.attr('data-date', date.toISOString());
}


function remove(array, element) {
    return array.filter(e => e != element);
}

function pushUnique(array, element) {
	if(array.indexOf(element) == -1){
		array.push(element);
	}
}

function setTimelineHeader(header, title, permalink, url, quote){
	var header_h3 = $('#timeline-header h3');
	var permalink_a = $('#permalink');
	var sharing = $('#sharing');
	
	if(!header && !title && !permalink){
		header_h3.html('');
		document.title = '#closerintime';
		sharing.html('');
		permalink_a.attr('href','');
	} else {
		header_h3.html(header);
		document.title = title;
		permalink_a.attr('href', permalink);
		
		var sharing_html = null;
		sharing_html = '<a id="twitter-share-button" target="_blank" href="https://twitter.com/intent/tweet?text='+encodeURIComponent(title)+'&url='+encodeURIComponent(url)+'" result-size="large"><i class="fa fa-twitter"></i> Tweet</a>';
		if(!quote){
			sharing_html = sharing_html + '<a id="facebook-share-button" target="_blank" href="https://www.facebook.com/dialog/share?app_id=1012298692240693&href='+encodeURIComponent(url)+'&hashtag=%23closerintime"><i class="fa fa-facebook"></i> Share</a>';
		} else  {
			sharing_html = sharing_html + '<a id="facebook-share-button" target="_blank" href="https://www.facebook.com/dialog/share?app_id=1012298692240693&href='+encodeURIComponent(url)+'&hashtag=%23closerintime&quote='+encodeURIComponent(quote)+'"><i class="fa fa-facebook"></i> Share</a>';
		}
		sharing_html = sharing_html + '<a id="clipboard-share-button" href="'+url+'"><i class="fa fa-clipboard"></i> Copy</a>';
			
		sharing.html(sharing_html);		
	}
}