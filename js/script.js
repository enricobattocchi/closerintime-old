var event_ids = new Array();
var event_objs = new Array();
var jsondata = null;
var db = null;

$(function(){
	
	initPopover();
	
	initSuggestionForm();
	
	initIndexedDB();

	$('#chooser-event-one-cancel').on('click',function(){
		$('#chooser-event-one').removeAttr('disabled');
		$('#chooser-event-one').typeahead('val','');
		$('#chooser-event-pre-one').attr('data-content', '').removeClass().addClass('chooser-event-pre');
		$('#chooser-event-link-one').addClass('hide').off('click');
		event_ids[0] = null;
		event_objs[0] = null;
	});

	$('#chooser-event-two-cancel').on('click',function(){
		$('#chooser-event-two').removeAttr('disabled');
		$('#chooser-event-two').typeahead('val','');
		$('#chooser-event-pre-two').attr('data-content', '').removeClass().addClass('chooser-event-pre');
		$('#chooser-event-link-two').addClass('hide').off('click');
		event_ids[1] = null;
		event_objs[1] = null;
	});
	
	$( window ).on('hashchange',function() {
		loadComparison();
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
	db.events.toArray(function(array){
		jsondata = array;
		initTypeahead();
	});
	
}

function loadComparison(){
	var hashpars = window.location.hash.substr(1);
	if(hashpars){
		var pars = hashpars.split('/');
		event_ids[0] = pars[0];
		if(pars[1]){
			event_ids[1] = pars[1];
			computeFromIDB();
		}
	}
}

function initTypeahead(){
	var events = new Bloodhound({
  		datumTokenizer: function(d) {
  			var datumstrings = Bloodhound.tokenizers.whitespace(d.name.replace('"','')+' '+d.year+' '+d.type);
  			datumstrings.push(d.name);
  			return datumstrings;
  	    },
  		queryTokenizer:function(query) {
  			var querystrings = whitespacelesshyphen(query);
  			return querystrings;
  	    }, 
  		local: jsondata
	});

	$('#chooser .typeahead').typeahead({
		minLength: 3,
		}, {
		name: 'events',
		/*display: 'name',*/
		display: function(data){
			var string = data.name;
			var year = data.year;
			if(data.year < 0){
				year = Math.abs(data.year)+ ' B.C.';
			}
			return data.name+' – '+year;
			},
		limit: 40,
		source: function(query, syncResults){
			events.search(query,function(suggestions){
					syncResults(filterselected(suggestions));
				});
		},
		templates: {
    		notFound: [
      		'<div class="empty-message">',
        		'<i class="fa fa-exclamation-triangle"></i> Unable to find any matches. <a href="javascript:opensuggest();">Want to send a suggestion?</a>',
      		'</div>'
    		].join('\n'),
    		suggestion: function(data){
    			var year = data.year;
    			if(data.year < 0){
    				year = Math.abs(data.year)+ ' B.C.';
    			}
    			return '<div><i class="fa '+data.type+'"></i> <strong>'+data.name+'</strong> – '+year+'</div>';}
		}
	}).on('typeahead:select', function(e, obj){
		var index = $('#chooser input[id^="chooser-"').index(this);
		event_ids[index] = obj.id;
		event_objs[index] = obj;
		updateHashFromIDS();
		$(this).closest('.input-group').find('.chooser-event-pre').addClass(obj.type).attr('data-content', obj.type);
		if(obj.link){
			$(this).closest('.input-group').find('.chooser-link').removeClass('hide').click(obj,function(event){
				window.open(event.data.link);				
			});
		} else{
			$(this).closest('.input-group').find('.chooser-link').addClass('hide').off('click');
		}
		$(this).blur();
		$(this).attr('disabled','disabled');
		//computeFromIDB();	
	}).on('typeahead:render', function(){
		if(!$(this).typeahead('val')){
				var index = $('#chooser input[id^="chooser-"').index(this);
				event_ids[index] = '';
		}			
	}).typeahead('val', '');	
}

function updateHashFromIDS(){
	var url = window.location.href.split('#');
	window.location.href = url[0] + '#'+(event_ids[0]?event_ids[0]:'')+'/'+(event_ids[1]?event_ids[1]:'');
}


function whitespacelesshyphen(str) {
    str = (typeof str === "undefined" || str === null) ? "" : str + "";
    str = str.split('–');
    str = str[0];
    return str ? str.split(/\s+/) : [];
}

function filterselected(suggestions){
	var filtered = new Array();
	if(suggestions.length > 0){
		suggestions.forEach(function(item){
			if(item.id !== event_ids[0] && item.id !== event_ids[1]){
				filtered.push(item);
			}
		});	
	}
	return filtered;
}

function initPopover(){
	$('[data-toggle="popover"]').popover();	
}

function initSuggestionForm(){
    $('form[data-async]').on('submit', function(event) {
        var $form = $(this);
        var $target = $($form.attr('data-target'));

        if($('input[name="name"').val() && $('input[name="year"').val()){
	        /*
         	$.ajax({
	            type: $form.attr('method'),
	            url: $form.attr('action'),
	            data: $form.serialize(),

	            success: function(data, status) {
	                $target.html(data);
	            }
	        });
			*/
        	$form.serialize();
        	var item = {};
        	item.name = $('input[name="name"').val();
        	item.year = $('input[name="year"').val();
        	item.month = $('input[name="month"').val();
        	item.day = $('input[name="day"').val();
        	db.suggestions.add(item).then(function(){
        		$target.html('Suggestion successfully stored.');
            	$('input[name="name"').val('');
            	$('input[name="year"').val('');
            	$('input[name="month"').val('');
            	$('input[name="day"').val('');
        	});    	
		} else {
			$target.html("You must fill at least the event name and year");
		}

        event.preventDefault();
	});	
}

function pushSuggestions(){
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
	db = new Dexie("closerintime");

	db.version(10).stores({
	    events: "id, &name, year, month, day, type, plural, enabled, capitalize_first, link",
	});
		
	db.version(11).stores({
	    events: "id, &name, year, month, day, type, plural, enabled, capitalize_first, link",
	    suggestions: "++id, name, year, month, day"
	});
	
	db.on('ready', function () {
        return db.events.clear()
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
                            resolve(data);
                        }
                    });
                }).then(function (data) {
                    console.log("Got ajax response. We'll now add the objects.");
                    // By returning the db.transaction() promise, framework will keep
                    // waiting for this transaction to commit before resuming other
                    // db-operations.
                    return db.transaction('rw', db.events, function () {
                    	var counter = 0;
                        data.forEach(function (item) {
                            db.events.add(item);
                            counter++;
                        });
                        console.log("Added "+counter+" events");
                    });
                }).then(function () {
                    console.log ("Transaction committed");
                });
            });
        });


    db.open()
    	.then(function(){
    		initJSONdata();
    		loadComparison();
    	}).catch(function (error) {
    		console.error(error.stack || error);
    });
	
}

function computeFromIDB(){
	if(!$.isNumeric(event_ids[0]) || !$.isNumeric(event_ids[1])) return;
	
	db.events.where('id').
		anyOf(event_ids[0],event_ids[1])
		.toArray()
		.then(function(data){
			populateIDB(data);
		});
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
	var datenow = moment();
	
	var total_span;
	var first_span;
	var second_span;
	var percentage;

	if(!data[0].month || !data[1].month){
		// let's use only the years
		bol_years_only = true;

		var datetime = new Array(2);
		
		datetime[0] = moment().year(data[0].year);
		
		datetime[1] = moment().year(data[1].year);
		
		// reverse order if first event is more recent
		if(datetime[1].isBefore(datetime[0])){
			data.reverse();
			datetime.reverse();
		}

		total_span = Math.abs(datenow.diff(datetime[0], 'years'));
		first_span = Math.abs(datetime[0].diff(datetime[1], 'years'));
		second_span = Math.abs(datenow.diff(datetime[1], 'years'));

		percentage = 100*first_span/total_span;
		result.start.date = (datetime[0].year() < 0)? Math.abs(datetime[0].year())+' B.C.' : datetime[0].year();
		result.middle.date = (datetime[1].year() < 0)? Math.abs(datetime[1].year())+' B.C.' : datetime[1].year();
		result.now_date = datenow.year();

		result.timeline_1 = first_span + " years";
		result.timeline_2 = second_span + " years";
	} else {
		bol_years_only = false;

		var datetime = new Array(2);
		
		datetime[0] = moment().year(data[0].year).month(parseInt(data[0].month)-1).date(data[0].day);
		
		datetime[1] = moment().year(data[1].year).month(parseInt(data[1].month)-1).date(data[1].day);
		
		// reverse order if first event is more recent
		if(datetime[1].isBefore(datetime[0])){
			data.reverse();
			datetime.reverse();
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

		result.timeline_1 = first_span + ' days';
		result.timeline_2 = second_span + ' days';
	}

	result.start.id = data[0]['id'];
	result.start.description = data[0].name;
	result.start.category_icon = data[0].type;
	result.start.size = percentage+"%";
	result.start.link = data[0].link;

	result.middle.id = data[1].id;
	result.middle.description = data[1].name;
	result.middle.category_icon = data[1].type;
	result.middle.size = (100-percentage)+"%";
	result.middle.verb = (data[1].plural == 1)? 'are' : 'is' ;
	result.middle.link = data[1].link;

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
	
	if(chooser_event_one.typeahead('val') !== result.start.description){
		chooser_event_one.attr('disabled', 'disabled').typeahead('val',result.start.description);
		chooser_event_one.closest('.input-group').find('.chooser-event-pre').removeClass().addClass('chooser-event-pre').addClass(result.start.category_icon).attr('data-content', result.start.category_icon);
		if(result.start.link){
			chooser_event_one.closest('.input-group').find('.chooser-link').removeClass('hide').click(result.start,function(event){
				window.open(event.data.link);				
			});
		} else{
			chooser_event_one.closest('.input-group').find('.chooser-link').addClass('hide').off('click');
		}
	}
	if(chooser_event_two.typeahead('val') !== result.middle.description){
		chooser_event_two.attr('disabled', 'disabled').typeahead('val',result.middle.description);
		chooser_event_two.closest('.input-group').find('.chooser-event-pre').removeClass().addClass('chooser-event-pre').addClass(result.middle.category_icon).attr('data-content', result.middle.category_icon);
		if(result.middle.link){
			chooser_event_two.closest('.input-group').find('.chooser-link').removeClass('hide').click(result.middle,function(event){
				window.open(event.data.link);				
			});
		} else{
			chooser_event_two.closest('.input-group').find('.chooser-link').addClass('hide').off('click');
		}
	}
}

function lcfirst (str) {
	str += '';
	var f = str.charAt(0)
	    .toLowerCase();
	return f + str.substr(1);
}