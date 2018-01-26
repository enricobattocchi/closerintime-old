/**
 * Reads the hash part of the URL to fill the chooser input field and start the
 * computation
 */
function loadComparison(){
	console.log("execute loadComparison");
	var hashpars = window.location.pathname.substr(1);
	var chooser_events = $('#chooser input.tt-input');
	if(hashpars){
		var pars = hashpars.split('/');
		if($.isNumeric(pars[0])){
			event_ids[0] = pars[0];
			if(pars[1]){
				/* both events set, let's compute everything */
				event_ids[1] = pars[1];
				computeFromIDB();
			} else {
				/* just one event set, fill the chooser field */		
				db.events.get(event_ids[0])
				.then(function(data){
					var chooser_event_one = $('#chooser-event-one');
					setNameEtc(chooser_event_one, data, 0);
				}).catch(function (e) {
					console.error('Error populating the chooser field: '+ e.toString());
					var chooser_event_one = $('#chooser-event-one');
					chooser_event_one.removeAttr('disabled').typeahead('val','');
					resetChooserButtons(chooser_event_one);
				});
			}
		} else {
			if(pars[0] == 'cancel'){
				db.localevents.clear().then(function(){
					showFlAlert('Local events cleared.','info');
					updateHashFromIDS();
				}).catch(function(error){
					console.error('Failed to clear local events: '+error);
					showFlAlert('Failed to clear local events.','warning');
					updateHashFromIDS();
				});
				
			}
		}
	}
}


/**
 * reads the event_ids array and updates the url with the IDs in the hash part
 */
function updateHashFromIDS(){
	console.log("execute updateHashFromIDS");
	var url = window.location.origin;

	if( event_ids[0] > 0 && event_ids[1] > 0){
		var stateObj = { ids : [event_ids[0], event_ids[1]] };
		var path = event_ids[0] + '/' + event_ids[1];
		history.pushState(stateObj, path, '/'+path );
		computeFromIDB();
	} else {
		var stateObj = { ids : [event_ids[0], event_ids[1]] };
		var path = event_ids[0] + '/' + event_ids[1];
		history.pushState(stateObj, path, '/' );
		computeFromIDB();
		/*
		if( window.location.href != href ){
			window.location.href = href;
		}
		computeFromIDB();
		*/
	}

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




function insertEventObj(obj){
	var new_marker = $('#template .timeline-marker').clone();
	var marker_description = new_marker.find('.timeline-marker-description');
	var marker_icon = new_marker.find('.timeline-marker-icon');
	
	var new_timeline_part = $('#template .timeline-part').clone();
	
	if(obj.link.length){
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
	var marker_prev = timeline_part.prev('.timeline-marker');
	if(!marker_next || !marker_next.length){
		marker_next = timeline_part.next('.timeline-marker');
	}
	var datetime = [];
	var timeline_label = timeline_part.find('.timeline-part-label');
	
	if(marker_prev.length && marker_next.length){
		datetime[0] = moment(marker_prev.attr('data-date')).utc().hour(12).minute(0).seconds(0);
		datetime[1] = moment(marker_next.attr('data-date')).utc().hour(12).minute(0).seconds(0);
		
		timespan = Math.abs(datetime[0].diff(datetime[1], 'days'));
		
		if(settings.timespanformat == 1 || events_with_just_year > 0){
			var datetime_years = [];
			datetime_years[0] = moment().utc().year(marker_prev.attr('data-year')).hour(12).minute(0).seconds(0);
			datetime_years[1] = moment().utc().year(marker_next.attr('data-year')).hour(12).minute(0).seconds(0);
			timespan_for_label = Math.abs(datetime_years[0].diff(datetime_years[1], 'years'));
			timeline_label.html(timespan_for_label + (timespan > 1 ? " years" : "year"));
		} else if(settings.timespanformat == 0){
			timeline_label.html(timespan + (timespan > 1 ? " days" : " day"));
		} else if(settings.timespanformat == 2){
			timeline_label.html(moment.preciseDiff(datetime[0], datetime[1]));
		}
		
		return timespan;
	}
	
	return 0;
}

function checkTimespanLengths(){
	var timeline_parts = $('#timeline .timeline-part');
	
	timeline_parts.each(function(){
		$(this).css('flex-grow', calculateTimespanFromMarkers($(this)));
	})
}
