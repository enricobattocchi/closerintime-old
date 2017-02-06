var event_ids = new Array();
var jsondata = null;
var db = null;

$(function(){
	
	initPopover();
	
	initSuggestionForm();
	
	initIndexedDB();

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

});



function preload(){
    jQuery.ajax({
        url: 'lookup.php',
        success: function (result) {
            jsondata = JSON.parse(result);
        },
        async: false
    });	
}

function initJSONdata(){
	var request = db.transaction("events").objectStore("events").getAll();
	request.onsuccess = function(event) {
		  	jsondata = event.target.result;
		  	initTypeahead();
	}
}

function loadComparison(){
	var hashpars = window.location.hash.substr(1);
	if(hashpars){
		var pars = hashpars.split('/');
		event_ids[0] = pars[0];
		if(pars[1]){
			event_ids[1] = pars[1];
			computeFromIDB();
			event_ids = new Array();
		}
	}
}

function initTypeahead(){
	var events = new Bloodhound({
  		datumTokenizer: function(d) {
  			var datumstrings = Bloodhound.tokenizers.whitespace(d.name+' '+d.year+' '+d.type);
  			datumstrings.push(d.name);
  			return datumstrings;
  	    },
  		queryTokenizer:function(query) {
  			var querystrings = Bloodhound.tokenizers.nonword(query);
  			return querystrings;
  	    }, 
  		local: jsondata
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
		computeFromIDB();		
	}).on('typeahead:render', function(){
		var index = $('#chooser input[id^="chooser-"').index(this);
		event_ids[index] = '';			
	}).typeahead('val', '');	
}

function initPopover(){
	$('[data-toggle="popover"]').popover();	
}

function initSuggestionForm(){
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

function initIndexedDB(){
	if (!window.indexedDB) {
	    window.alert("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.");
	}
	var request = window.indexedDB.open("closerintime", 10);
	
	request.onerror = function(event) {
	  alert("Why didn't you allow my web app to use IndexedDB?!");
	};
	request.onsuccess = function(event) {
		  db = event.target.result;	  
		  initJSONdata();  
		  loadComparison();
	}
	request.onupgradeneeded = function(event) {
		window.indexedDB.deleteDatabase("closerintime");
		
		var objectStore = event.target.result.createObjectStore("events", { keyPath: "id" });
		objectStore.createIndex("name", "name", { unique: true });
		objectStore.createIndex("type", "type", { unique: false });
		objectStore.createIndex("year", "year", { unique: false });

		preload();
		
		objectStore.transaction.oncomplete = function(event) {
			var eventsObjectStore = event.target.db.transaction("events", "readwrite").objectStore("events");
		    for (var i in jsondata) {
		    	eventsObjectStore.add(jsondata[i]);
		    }
		  };
		};
}

function computeFromIDB(){
	if(!$.isNumeric(event_ids[0]) || !$.isNumeric(event_ids[1])) return;
	
	data = new Array();

	db.transaction("events").objectStore("events").get(event_ids[0]).onsuccess = function(event) {
		data.push(event.target.result);
		populateIDB(data);
	};
	
	db.transaction("events").objectStore("events").get(event_ids[1]).onsuccess = function(event) {
		data.push(event.target.result);
		populateIDB(data);
	};
}

function populateIDB(data){
	if (data.length != 2) return;
	
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

	var result = {};
	result.start = {};
	result.middle = {};
	result.end = {};
	var bol_years_only = true;
	var datenow = new Date();
	
	var total_span;
	var first_span;
	var second_span;
	var percentage;

	if(!data[0].month || !data[1].month){
		// let's use only the years
		bol_years_only = true;

		// reverse order if first event is more recent
		if(data[0].year > data[1].year){
			data.reverse();
		}

		total_span = Math.abs(datenow.getFullYear() - parseInt(data[0].year));
		first_span = Math.abs(parseInt(data[0].year) - parseInt(data[1].year));
		second_span = Math.abs(datenow.getFullYear() - parseInt(data[1].year));

		percentage = 100*first_span/total_span;
		result.start.date = (parseInt(data[0].year) < 0)? Math.abs(parseInt(data[0].year))+' B.C.' : parseInt(data[0].year);
		result.middle.date = (parseInt(data[1].year) < 0)? Math.abs(parseInt(data[1].year))+' B.C.' : parseInt(data[1].year);
		result.now_date = datenow.getFullYear();

		result.timeline_1 = first_span + " years";
		result.timeline_2 = second_span + " years";
	} else {
		bol_years_only = false;

		var datetime = new Array(2);
		
		datetime[0] = new Date();
		datetime[0].setFullYear(parseInt(data[0].year));
		datetime[0].setMonth(parseInt(data[0].month));
		datetime[0].setDate(parseInt(data[0].day));

		datetime[1] = new Date();
		datetime[1].setFullYear(parseInt(data[1].year));
		datetime[1].setMonth(parseInt(data[1].month));
		datetime[1].setDate(parseInt(data[1].day));
		

		// reverse order if first event is more recent
		if(datetime[0] > datetime[1]){
			data.reverse();
			datetime.reverse();
		}

		total_span = date_diff_in_days(datenow,datetime[0]);
		first_span = date_diff_in_days(datetime[1],datetime[0]);
		second_span = date_diff_in_days(datetime[1],datetimenow);

		percentage = 100*first_span/total_span;

		/*year_0 = (parseInt(data[0].year) < 0)? Math.abs(parseInt(data[0].year))+' B.C.' : parseInt(data[0].year);
		year_1 = (parseInt(data[1].year) < 0)? Math.abs(parseInt(data[1].year))+' B.C.' : parseInt(data[1].year);*/
		
		var options = { year: 'numeric', month: 'long', day: 'numeric' };
		
		result.start.date = datetime[0].toLocaleDateString('en-US', options);
		result.middle.date = datetime[1].toLocaleDateString('en-US', options);
		result.now_date = datenow.toLocaleDateString('en-US', options);

		result.timeline_1 = first_span + ' days';
		result.timeline_2 = second_span + ' days';
	}

	result.start.id = data[0]['id'];
	result.start.description = data[0].name;
	result.start.category_icon = data[0].type;
	result.start.size = percentage+"%";

	result.middle.id = data[1].id;
	result.middle.description = data[1].name;
	result.middle.category_icon = data[1].type;
	result.middle.size = (100-percentage)+"%";
	result.middle.verb = (data[1].plural == 1)? 'are' : 'is' ;

	second_term_of_comparison = (data[0].capitalize_first == 1)? result.start.description : lcfirst(result.start.description);


	if(percentage > 50){
		result.header = result.middle.description+" "+result.middle.verb+" closer in time to us than to "+second_term_of_comparison+".";
		result.title = result.middle.description+" "+result.middle.verb+" #closerintime to us than to "+second_term_of_comparison+".";
	} else if(percentage < 50){
		result.header = result.middle.description+" "+result.middle.verb+" closer in time to "+second_term_of_comparison+" than to us.";
		result.title = result.middle.description+" "+result.middle.verb+" #closerintime to "+second_term_of_comparison+" than to us.";
	} else {
		result.header = result.middle.description+" "+result.middle.verb+" exactly halfway between "+second_term_of_comparison+" and us.";
		result.title = result.middle.description+" "+result.middle.verb+" is exactly halfway between "+second_term_of_comparison+" and us. #closerintime";
	}

	header_h3.html(result.header);
	document.title = result.title;
	permalink.attr('href', '#'+result.start.id+'/'+result.middle.id);
	var url = window.location.href.split('#');
	window.location.href = url[0] + '#'+result.start.id+'/'+result.middle.id;
	sharing.html('<a id="twitter-share-button" target="_blank" href="https://twitter.com/intent/tweet?text='+encodeURIComponent(result.title)+'&url='+encodeURIComponent(window.location.href)+'" result-size="large"><i class="fa fa-twitter"></i> Tweet</a>');

	start_date.html(result.start.date);
	start_description.html(result.start.description);
	//chooser_event_one.typeahead('val', result.start.description);


	middle_date.html(result.middle.date);
	middle_description.html(result.middle.description);
	//chooser_event_two.typeahead('val', result.middle.description);
	

	end_date.html(result.now_date);

	timeline_part_one_label.html(result.timeline_1);
	timeline_part_two_label.html(result.timeline_2);

	timeline_part_one.width(result.start.size);
	timeline_part_two.width(result.middle.size);
	middle.css('left', result.start.size);

	start_icon.removeClass().addClass('timeline-marker-icon '+result.start.category_icon);
	middle_icon.removeClass().addClass('timeline-marker-icon '+result.middle.category_icon);
}

function date_diff_in_days(d1, d2) {
    var t2 = d2.getTime();
    var t1 = d1.getTime();
	
	return parseInt(Math.abs(t2-t1)/(24*3600*1000));
}

function lcfirst (str) {
	str += '';
	var f = str.charAt(0)
	    .toLowerCase();
	return f + str.substr(1);
}