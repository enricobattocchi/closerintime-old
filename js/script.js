var event_ids = new Array();

function populate(data){

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

	var end_date = $('#timeline-marker-end .date');

	var timeline_part_one = $('#timeline-part-one');
	var timeline_part_one_label = $('#timeline-part-one .timeline-part-label');

	var timeline_part_two = $('#timeline-part-two');
	var timeline_part_two_label = $('#timeline-part-two .timeline-part-label');

	var chooser_event_one = $('#chooser-event-one');
	var chooser_event_two = $('#chooser-event-two');


	header_h3.html(data.header);
	document.title = data.title;
	permalink.attr('href', '#'+data.start.id+'/'+data.middle.id);
	var url = window.location.href.split('#');
	window.location.href = url[0] + '#'+data.start.id+'/'+data.middle.id;
	sharing.html('<a id="twitter-share-button" target="_blank" href="https://twitter.com/intent/tweet?text='+encodeURIComponent(data.title)+'&url='+encodeURIComponent(window.location.href)+'" data-size="large"><i class="fa fa-twitter"></i> Tweet</a>');

	start_date.html(data.start.date);
	start_description.html(data.start.description);
	//chooser_event_one.typeahead('val', data.start.description);


	middle_date.html(data.middle.date);
	middle_description.html(data.middle.description);
	//chooser_event_two.typeahead('val', data.middle.description);
	

	end_date.html(data.now_date);

	timeline_part_one_label.html(data.timeline_1);
	timeline_part_two_label.html(data.timeline_2);

	timeline_part_one.width(data.start.size);
	timeline_part_two.width(data.middle.size);
	middle.css('left', data.start.size);

	start_icon.removeClass().addClass('timeline-marker-icon '+data.start.category_icon);
	middle_icon.removeClass().addClass('timeline-marker-icon '+data.middle.category_icon);
}

$(function(){
	/*$(document).click(function(){
		populate(dataJSON);
	});*/

	var hashpars = window.location.hash.substr(1);

	if(hashpars){
		var pars = hashpars.split('/');
		event_ids[0] = pars[0];
		if(pars[1]){
			event_ids[1] = pars[1];
			compute();
			event_ids = new Array();
		}
	}


	var events = new Bloodhound({
  		datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
  		queryTokenizer: Bloodhound.tokenizers.whitespace,
  		prefetch: {
  			url: 'lookup.php'
  		},
  		remote: {
    		url: 'lookup.php',
    		//wildcard: '%QUERY',
			prepare: function(query, settings){
				settings.data = {query: query, exclude: event_ids};
				return settings;
			},
			rateLimitBy: 'throttle'
  		}
	});

	$('#chooser .typeahead').typeahead({
		minLength: 3,
		}, {
		name: 'events',
		/*display: 'name',*/
		display: function(data){return data.name+' – '+data.year;},
		limit: 40,
		source: events,
		templates: {
    		notFound: [
      		'<div class="empty-message">',
        		'<i class="fa fa-exclamation-triangle"></i> Unable to find any matches. <a href="javascript:opensuggest();">Want to send a suggestion?</a>',
      		'</div>'
    		].join('\n'),
    		suggestion: function(data){return '<div><i class="fa '+data.type+'"></i> <strong>'+data.name+'</strong> – '+data.year+'</div>';}
		}
	}).on('typeahead:select', function(e, obj){
		var index = $('#chooser input[id^="chooser-"').index(this);
		event_ids[index] = obj.id;
		$(this).closest('.input-group').find('.chooser-event-pre').addClass(obj.type).attr('data-content', obj.type);
		$(this).blur();
		compute();		
	}).on('typeahead:render', function(){
		var index = $('#chooser input[id^="chooser-"').index(this);
		event_ids[index] = '';			
	}).typeahead('val', '');

	$('#chooser-event-one-cancel').on('click',function(){
		$('#chooser-event-one').typeahead('val','');
		$('#chooser-event-pre-one').attr('data-content', '').removeClass().addClass('chooser-event-pre');
		event_ids[0] = null;
	});


	$('#chooser-event-two-cancel').on('click',function(){
		$('#chooser-event-two').typeahead('val','');
		$('#chooser-event-pre-two').attr('data-content', '').removeClass().addClass('chooser-event-pre');
		event_ids[1] = null;
	});


	$('[data-toggle="popover"]').popover()

    $('form[data-async]').on('submit', function(event) {
        var $form = $(this);
        var $target = $($form.attr('data-target'));

        if($('input[name="name"').val() && $('input[name="year"').val()){

	        $.ajax({
	            type: $form.attr('method'),
	            url: $form.attr('action'),
	            data: $form.serialize(),

	            success: function(data, status) {
	                $target.html(data);
	            }
	        });

		} else {
			$target.html("You must fill at least the event name and year");
		}

        event.preventDefault();
	});

});

function compute(){
	if(!$.isNumeric(event_ids[0]) || !$.isNumeric(event_ids[1])) return;
	var qstring ={
		"event_0": event_ids[0],
		"event_1": event_ids[1],
	}
	$.getJSON('compute.php', qstring, function(data){
		populate(data);
	});
}

function opensuggest(){
	$('#suggest').removeClass('hide');
}

function closesuggest(){
	var form = $('#suggest form');
	form.find('input[type="text"]').val('');
	$(form.attr('data-target')).html('');
	$('#suggest').addClass('hide');
}