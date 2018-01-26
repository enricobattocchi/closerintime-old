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