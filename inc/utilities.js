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