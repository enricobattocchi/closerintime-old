<?php 
require_once('connection.php');

$path = $_SERVER['REQUEST_URI'];
$path = explode('/', $path);
array_shift($path);

$data = array();
$result = array();
$ids = array();
$title = '#closerintime';
$url = 'https://closerinti.me';
$image = $url.'/img/closerintime-img-sharing.png';

$whr = array();
foreach ($path as $id){
	if (!empty($id) && is_numeric($id)){
		$whr[] = ' id = '.$id.' ';
	}
}

if(count($whr)){
	$whr = ' AND ( '.implode(' OR ', $whr).' ) ';
} else {
	$whr = '';
}

$sql = "SELECT id, name, year, month, day, plural "
		. "FROM events "
		. "WHERE enabled <> 0 ".
		$whr;
$res = $db->query( $sql );
if ( erli( $sql, $res, $db ) && ( mysqli_num_rows( $res ) > 0 ) ) {
	while( $row = mysqli_fetch_assoc( $res )){
		$data[] = $row;
		$ids[] = $row['id'];
	}
}

if (count($data) == 2){
	
	//asort($ids);
	//$image = "/thumb/$ids[0]_$ids[1].png";
	
	if(empty($data[0]['month']) || empty($data[1]['month'])){
		// let's use only the years
		$bol_years_only = true;
	
		$datetime = array(2);
		
		$datetime[0] = new DateTime();
		$datetime[1] = new DateTime();
		$datenow = new DateTime();
		$datetime[0]->setDate($data[0]['year'], $datenow->format('m'), $datenow->format('d'))->setTime(12,0,0);
		$datetime[1]->setDate($data[1]['year'], $datenow->format('m'), $datenow->format('d'))->setTime(12,0,0);
		$datenow->setTime(12,0,0);
			
		// reverse order if first event is more recent
		if($datetime[1] < $datetime[0]){
			$data = array_reverse($data);
			$datetime = array_reverse($datetime);
		}
	
		$diff_now_0 = $datenow->diff($datetime[0]);
		$diff_0_1 = $datetime[0]->diff($datetime[1]);
		$diff_now_1 = $datenow->diff($datetime[1]);
		
		$total_span = abs($diff_now_0->format('%y'));
		$first_span = abs($diff_0_1->format('%y'));
		$second_span = abs($diff_now_1->format('%y'));
	
		$percentage = 100*$first_span/$total_span;
	
		$year_0 = ($datetime[0]->format('y') < 0)? abs($datetime[0]->format('y')).' B.C.' : $datetime[0]->format('y');
		$year_1 = ($datetime[1]->format('y') < 0)? abs($datetime[1]->format('y')).' B.C.' : $datetime[1]->format('y');		
	
		$result['start']['date'] = $year_0;
		$result['middle']['date'] = $year_1;
		$result['now_date'] = $datenow->format('y');
	
		$result['timeline_1'] = $first_span . ($first_span > 1 ? " years" : " year");
		$result['timeline_2'] = $second_span . ($second_span > 1 ? " years" : " year");
	} else {
		$bol_years_only = false;
	
		$datetime = array(2);
	
		$datetime[0] = new DateTime();
		$datetime[1] = new DateTime();
		$datenow = new DateTime();
		$datetime[0]->setDate($data[0]['year'], $data[0]['month'], $data[0]['day'])->setTime(12,0,0);
		$datetime[1]->setDate($data[1]['year'], $data[1]['month'], $data[1]['day'])->setTime(12,0,0);
		$datenow->setTime(12,0,0);
		
		// reverse order if first event is more recent
		if($datetime[1] < $datetime[0]){
			$data = array_reverse($data);
			$datetime = array_reverse($datetime);
		}
	
		$diff_now_0 = $datenow->diff($datetime[0]);
		$diff_0_1 = $datetime[0]->diff($datetime[1]);
		$diff_now_1 = $datenow->diff($datetime[1]);
		
		$total_span = abs($diff_now_0->format('%d'));
		$first_span = abs($diff_0_1->format('%d'));
		$second_span = abs($diff_now_1->format('%d'));
	
		$percentage = 100*$first_span/$total_span;
	
	
		$year_0 = ($datetime[0]->format('y') < 0)? abs($datetime[0]->format('y')).' B.C.' : $datetime[0]->format('y');
		$year_1 = ($datetime[1]->format('y') < 0)? abs($datetime[1]->format('y')).' B.C.' : $datetime[1]->format('y');	
	
		$format = 'F j';
	
		$result['start']['date'] = $datetime[0]->format($format).', '.$year_0;
		$result['middle']['date'] = $datetime[1]->format($format).', '.$year_1;
		$result['now_date'] = $datenow->format($format.', Y');
	
		$result['timeline_1'] = $first_span . ($first_span > 1 ? " days" : " day");
		$result['timeline_2'] = $second_span . ($second_span > 1 ? " days" : " day");
	}
	
	$result['start']['id'] = $data[0]['id'];
	$result['start']['description'] = ucfirst($data[0]['name']);
	//result.start.category_icon = data[0].type;
	//result.start.size = percentage+"%";
	//result.start.link = data[0].link;
	
	$result['middle']['id'] = $data[1]['id'];
	$result['middle']['description'] = ucfirst($data[1]['name']);
	//result.middle.category_icon = data[1].type;
	//result.middle.size = (100-percentage)+"%";
	$result['middle']['verb'] = ($data[1]['plural'] == 1)? 'are' : 'is' ;
	//result.middle.link = data[1].link;
	
	$second_term_of_comparison = $data[0]['name'];
	
	if($percentage > 50){
		$result['header'] = $result['middle']['description']." ".$result['middle']['verb']." closer in time to us than to ".$second_term_of_comparison.".";
		$title = htmlentities( $result['middle']['description']." ".$result['middle']['verb']." #closerintime to us than to ".$second_term_of_comparison."." );
	} else if($percentage < 50){
		$result['header'] = $result['middle']['description']." ".$result['middle']['verb']." closer in time to ".$second_term_of_comparison." than to us.";
		$title = htmlentities( $result['middle']['description']." ".$result['middle']['verb']." #closerintime to ".$second_term_of_comparison." than to us." );
	} else {
		$result['header'] = $result['middle']['description']." ".$result['middle']['verb']." exactly halfway between ".$second_term_of_comparison." and us.";
		$title = htmlentities( $result['middle']['description']." ".$result['middle']['verb']." is exactly halfway between ".$second_term_of_comparison." and us. #closerintime" );
	}
	
	$image = $url."/thumb/".$result['start']['id']."_".$result['middle']['id'].".png";
	$url .= '/'.$result['start']['id'].'/'.$result['middle']['id'];	
	
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#fa7921">
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<meta property="og:title" content="<?php echo $title; ?>">
<meta property="og:site_name" content="#closerintime">
<meta property="og:url" content="<?php echo $url; ?>">
<meta property="og:description"
	content="Timespan comparisons between historical events.">
<meta property="og:type" content="website">
<meta property="og:image"
	content="<?php echo $image; ?>">
<meta property="fb:app_id" content="1012298692240693">
	
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:creator" content="@lopo">
<meta name="twitter:title" content="<?php echo $title; ?>">
<meta name="twitter:description" content="Timespan comparisons between historical events.">
<meta name="twitter:image" content="<?php echo $image; ?>">

<link rel="apple-touch-icon" sizes="57x57" href="/apple-icon-57x57.png">
<link rel="apple-touch-icon" sizes="60x60" href="/apple-icon-60x60.png">
<link rel="apple-touch-icon" sizes="72x72" href="/apple-icon-72x72.png">
<link rel="apple-touch-icon" sizes="76x76" href="/apple-icon-76x76.png">
<link rel="apple-touch-icon" sizes="114x114"
	href="/apple-icon-114x114.png">
<link rel="apple-touch-icon" sizes="120x120"
	href="/apple-icon-120x120.png">
<link rel="apple-touch-icon" sizes="144x144"
	href="/apple-icon-144x144.png">
<link rel="apple-touch-icon" sizes="152x152"
	href="/apple-icon-152x152.png">
<link rel="apple-touch-icon" sizes="180x180"
	href="/apple-icon-180x180.png">
<link rel="icon" type="image/png" sizes="192x192"
	href="/android-icon-192x192.png">
<link rel="icon" type="image/png" sizes="32x32"
	href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="96x96"
	href="/favicon-96x96.png">
<link rel="icon" type="image/png" sizes="16x16"
	href="/favicon-16x16.png">
<link rel="manifest" href="/manifest.json">
<meta name="msapplication-TileColor" content="#ffffff">
<meta name="msapplication-TileImage" content="/ms-icon-144x144.png">
<meta name="theme-color" content="#ffffff">

<!-- Latest compiled and minified CSS -->
<link rel="stylesheet" href="/css/bootstrap.min.css">
<link rel="stylesheet" href="/css/typeahead.css" />
<link rel="stylesheet" href="/css/style.css" />

<script src="/js/jquery-3.1.1.min.js"></script>
<script src="/js/bootstrap.min.js"></script>
<script src="/js/typeahead.bundle.min.js"></script>
<script src="/js/dexie.min.js"></script>
<script src="/js/moment.min.js"></script>
<script src="/js/moment-precise-range.js"></script>
<script src="/js/script.js" async></script>

<title><?php echo $title; ?></title>

<script>
	(function(i, s, o, g, r, a, m) {
		i['GoogleAnalyticsObject'] = r;
		i[r] = i[r] || function() {
			(i[r].q = i[r].q || []).push(arguments)
		}, i[r].l = 1 * new Date();
		a = s.createElement(o), m = s.getElementsByTagName(o)[0];
		a.async = 1;
		a.src = g;
		m.parentNode.insertBefore(a, m)
	})(window, document, 'script',
			'https://www.google-analytics.com/analytics.js', 'ga');

	ga('create', 'UA-13108600-3', 'auto');
	ga('send', 'pageview');
</script>
</head>
<body>
	<header id="main">
		<h1>
			<a href="https://closerinti.me" rel="bookmark">#closerintime</a>
		</h1>
	</header>
	<section id="chooser" class="transparent">
		<h2 id="chooser-header">
			Pick two events <i id="openinstructions" class="fa fa-question-circle-o"
				data-toggle="modal" data-target="#instructions"></i>
				<i id="opensettings" class="fa fa-cog"
				data-toggle="modal" data-target="#settings"></i>
		</h2>
		<div class="container-fluid">
			<div class="row">
				<div class="col-md-6">
					<label class="sr-only" for="chooser-event-one">Look up an event or add your own</label>
					<div class="input-group">
						<span class="input-group-addon"><i
							id="chooser-event-pre-one" class="chooser-event-pre"></i></span> <input
							type="text" class="form-control typeahead"
							placeholder="Look up an event or add your own" id="chooser-event-one"
							name="chooser-event-one" value="" /> <span
							class="input-group-btn">
							<button class="btn btn-default hide chooser-link"
								id="chooser-event-link-one" type="button">
								<i class="fa fa-wikipedia-w"></i>
							</button>
							<button class="btn btn-default chooser-edit"
								id="chooser-event-edit-one" data-frominput="0" 
								data-toggle="modal" data-target="#suggest"
								type="button">
								<i class="fa fa-pencil"></i>
							</button>
							<button class="btn btn-default hide chooser-cancel" id="chooser-event-one-cancel"
								type="button">
								<i class="fa fa-close"></i>
							</button>
						</span>
					</div>
				</div>
				<div class="col-md-6">
					<label class="sr-only" for="chooser-event-one">Look up another event or add your own</label>
					<div class="input-group">
						<span class="input-group-addon"><i
							id="chooser-event-pre-two" class="chooser-event-pre"></i></span> <input
							type="text" class="form-control typeahead"
							placeholder="Look up another event or add your own" id="chooser-event-two"
							value="" /> <span class="input-group-btn">
							<button class="btn btn-default hide chooser-link"
								id="chooser-event-link-two" type="button">
								<i class="fa fa-wikipedia-w"></i>
							</button>
							<button class="btn btn-default chooser-edit"
								id="chooser-event-edit-two" data-frominput="1"
								data-toggle="modal" data-target="#suggest"
								type="button">
								<i class="fa fa-pencil"></i>
							</button>
							<button class="btn btn-default hide chooser-cancel" id="chooser-event-two-cancel"
								type="button">
								<i class="fa fa-close"></i>
							</button>
						</span>
					</div>
				</div>
			</div>
		</div>
	</section>
	<section id="timeline-section">
		<div id="timeline">

			<div id="timeline-marker-start" class="timeline-marker">
				<div id="timeline-marker-icon-start" class="timeline-marker-icon"></div>
				<div class="timeline-marker-label">
					<h5 class="date"></h5>
					<div class="timeline-marker-description"></div>
				</div>
			</div>
			<div id="timeline-part-one" class="timeline-part" style="width: 50%;">
				<h6 class="timeline-part-label"></h6>
			</div>
			<div id="timeline-marker-middle" class="timeline-marker"
				style="left: 50%;">
				<div class="timeline-marker-label">
					<h5 class="date"></h5>
					<div class="timeline-marker-description"></div>
				</div>
				<div id="timeline-marker-icon-middle" class="timeline-marker-icon"></div>
			</div>
			<div id="timeline-part-two" class="timeline-part" style="width: 50%;">
				<h6 class="timeline-part-label"></h6>
			</div>
			<div id="timeline-marker-end" class="timeline-marker">
				<div id="timeline-marker-icon-end" class="timeline-marker-icon"></div>
				<div class="timeline-marker-label">
					<h5 class="date"></h5>
					<div class="timeline-marker-description">Now</div>
				</div>
			</div>
		</div>
	</section>
	<section id="timeline-header">
		<a href="" id="permalink" rel="bookmark">
			<h3></h3>
		</a>
		<div id="sharing"></div>
	</section>
	<div class="modal fade" id="suggest" tabindex="-1" role="dialog"
		aria-labelledby="Suggestion Form">
		<div class="modal-dialog modal-sm" role="document">
			<div class="modal-content">
				<div class="modal-header">
					<button type="button" class="close" data-dismiss="modal"
						aria-label="Close">
						<i class="fa fa-close" aria-hidden="true"></i>
					</button>
					<h3 class="modal-title" id="suggest-label">Add/edit an event</h3>
				</div>
				<div class="modal-body">
					<form id="form-suggest" data-async data-target="#form-target"
						action="suggest.php" method="POST">
						<input type="hidden" name="id" value=""/>
						<input type="hidden" name="uuid" value=""/>
						<input type="hidden" name="frominput" value=""/>
						<div data-toggle="buttons" id="type-group" class="btn-group btn-group-justified">
							<label class="btn active"> <input
								type="radio" name="type" autocomplete="off" id="type-personal" value="personal"
								 checked="checked"><i class="fa personal"></i> Personal
							</label>
							<label class="btn"> <input
								type="radio" name="type" autocomplete="off" id="type-submitted" value="submitted"><i class="fa submitted"></i> Suggestion
							</label>
						</div>
						<label class="sr-only" for="name">Event name</label> <input
							type="text" class="form-control" name="name"
							placeholder="Event name" 
							data-toggle="popover" data-trigger="focus" data-html="true"
							data-content="Capitalize the first letter only when needed, e.g. '<em>Shakespeare's death</em>' but '<em>the foundation of Rome</em>'"
							data-placement="top"/>
							 <label class="sr-only" for="year">Year</label>
						<input type="number" class="form-control" name="year" min="-3000"
							max="2016" placeholder="Year" data-toggle="popover" data-trigger="focus" data-html="true"
							data-content="Negative values for B.C. years. <strong>There's no year 0</strong>."
							data-placement="top"/>
							<label class="sr-only"
							for="month">Month</label> <select name="month"
							placeholder="Month" disabled="disabled">
							<option value="">Month</option>
							<option value="01">January</option>
							<option value="02">February</option>
							<option value="03">March</option>
							<option value="04">April</option>
							<option value="05">May</option>
							<option value="06">June</option>
							<option value="07">July</option>
							<option value="08">August</option>
							<option value="09">September</option>
							<option value="10">October</option>
							<option value="11">November</option>
							<option value="12">December</option>
						</select> <label class="sr-only" for="day">Day</label> <select name="day"
							placeholder="Day" disabled="disabled">
							<option value="">Day</option>
							<option value="01">1</option>
							<option value="02">2</option>
							<option value="03">3</option>
							<option value="04">4</option>
							<option value="05">5</option>
							<option value="06">6</option>
							<option value="07">7</option>
							<option value="08">8</option>
							<option value="09">9</option>
							<option value="10">10</option>
							<option value="11">11</option>
							<option value="12">12</option>
							<option value="13">13</option>
							<option value="14">14</option>
							<option value="15">15</option>
							<option value="16">16</option>
							<option value="17">17</option>
							<option value="18">18</option>
							<option value="19">19</option>
							<option value="20">20</option>
							<option value="21">21</option>
							<option value="22">22</option>
							<option value="23">23</option>
							<option value="24">24</option>
							<option value="25">25</option>
							<option value="26">26</option>
							<option value="27">27</option>
							<option value="28">28</option>
							<option value="29">29</option>
							<option value="30">30</option>
							<option value="31">31</option>
						</select>
						<div class="btn-group" id="plural-group" data-toggle="buttons">
  							<label class="btn active">
    							<input type="radio" name="plural[]" id="singular" autocomplete="off" value="0" checked="checked"> is
  							</label>
  							<label class="btn">
								<input type="radio" name="plural[]" id="plural" autocomplete="off" value="1"> are
							</label>&nbsp; closer in time…
						</div>
					</form>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-primary hide" id="suggestions-delete">Delete</button>
					<button type="button" class="btn btn-primary" id="suggestions-save">Save</button>
				</div>
			</div>
		</div>
	</div>
	<div class="modal fade" id="settings" tabindex="-1" role="dialog"
		aria-labelledby="Settings">
		<div class="modal-dialog" role="document">
			<div class="modal-content">
				<div class="modal-header">
					<button type="button" class="close" data-dismiss="modal"
						aria-label="Close">
						<i class="fa fa-close" aria-hidden="true"></i>
					</button>
					<h3 class="modal-title" id="settings-label">Settings</h3>
				</div>
				<div class="modal-body">
					<fieldset>
						<legend>Chooser</legend>
						<div class="btn-group" id="showdates-group" data-toggle="buttons">
	 							<label class="btn active">
	   							<input type="radio" name="showdates" id="showdatesshow" autocomplete="off" value="0" checked="checked"> Show
	 							</label>
	 							<label class="btn">
								<input type="radio" name="showdates" id="showdatesdont" autocomplete="off" value="1"> Don't show
							</label>&nbsp; dates when selecting events
						</div>
					</fieldset>
					<fieldset>
						<legend>Timespan label format</legend>
						<p>This option is relevant only when two events with precise dates are selected.</p>
						<div class="btn-group" id="timespanformat-group" data-toggle="buttons">
							<label class="btn active">
	  							<input type="radio" name="timespanformat" id="timespanformatdays" autocomplete="off" value="0" checked="checked"> X days
							</label>
							<label class="btn">
								<input type="radio" name="timespanformat" id="timespanformatyears" autocomplete="off" value="1"> Y years
							</label>
							<label class="btn">
								<input type="radio" name="timespanformat" id="timespanformatprecise" autocomplete="off" value="2"> X years Y months Z days
							</label>
						</div>
					</fieldset>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-primary hide" data-dismiss="modal">Close</button>
					<button type="button" class="btn btn-primary" id="settings-save">Save</button>
				</div>
			</div>
		</div>
	</div>	
	<div class="modal fade" id="instructions" tabindex="-1" role="dialog"
		aria-labelledby="Instructions">
		<div class="modal-dialog" role="document">
			<div class="modal-content">
				<div class="modal-header">
					<button type="button" class="close" data-dismiss="modal"
						aria-label="Close">
						<i class="fa fa-close" aria-hidden="true"></i>
					</button>
					<h3 class="modal-title" id="suggest-label">Instructions</h3>
				</div>
				<div class="modal-body">
					<p>Choose two events by typing in the text fields to get suggestions. You can also search by year or by category:</p>
					 	<ul>
							<li><i class='fa music'></i> music</li>
							<li><i class='fa history'></i> history</li>
							<li><i class='fa computer'></i> computer</li>
							<li><i class='fa art'></i> art</li>
							<li><i class='fa film'></i> film</li>
							<li><i class='fa building'></i> building</li>
							<li><i class='fa science'></i> science</li>
							<li><i class='fa book'></i> book</li>
							<li><i class='fa sport'></i> sport</li>
							<li><i class='fa pop-culture'></i> pop culture</li>
							<li><i class='fa personal'></i> personal</li>
							<li><i class='fa submitted'></i> submitted</li>
						</ul>
						<p>After you've chosen two events, the timeline will be updated to show the timespans.</p>
						<p>You can add your personal events (e.g. the day of your birth) that will be stored locally in your browser and not shared with anyone.</p> 						
						<p>If you add an event as a suggestion, it will be submitted to be included in the global database of events.</p>
						<p>The dates chosen for some events may be approximate when a precise dating is not possible. Supporting one dating hypothesis against others is beyond the scope of this app. We suggest to read the Wikipedia article (using the <i class="fa fa-wikipedia-w"></i> button) to learn more about each event, person or object.</p>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-primary" data-dismiss="modal">Close</button>
				</div>
			</div>
		</div>
	</div>
	<div class="modal fade" id="credits" tabindex="-1" role="dialog"
		aria-labelledby="Credits">
		<div class="modal-dialog" role="document">
			<div class="modal-content">
				<div class="modal-header">
					<button type="button" class="close" data-dismiss="modal"
						aria-label="Close">
						<i class="fa fa-close" aria-hidden="true"></i>
					</button>
					<h3 class="modal-title" id="suggest-label">Credits</h3>
				</div>
				<div class="modal-body">
					<p>You can find the project's repository on <a
				href="https://github.com/enricobattocchi/closerintime"
				rel="author noopener" target="_blank">Github</a>.</p>
				<p>Libraries and resources used:</p>
					<ul>
						<li><a href='https://jquery.com/' rel='external noopener' target='_blank'>jQuery</a></li>
						<li><a href='http://getbootstrap.com/' rel='external noopener' target='_blank'>Bootstrap</a></li>
						<li><a href='http://fontawesome.io/' rel='external noopener' target='_blank'>Font Awesome</a></li>
						<li><a href='https://github.com/corejavascript/typeahead.js' rel='external noopener' target='_blank'>corejs-typeahead</a></li>
						<li><a href='http://dexie.org/' rel='external noopener' target='_blank'>Dexie.js</a></li>
						<li><a href='https://momentjs.com/' rel='external noopener' target='_blank'>moment.js</a></li>
						<li><a href='https://github.com/GoogleChrome/sw-precache' rel='external noopener' target='_blank'>sw-precache</a></li>
						<li><a href='http://www.dafont.com/it/comfortaa.font' rel='external noopener' target='_blank'>Comfortaa</a></li>				
						</ul>
					<p>You can <a href="https://paypal.me/lopo"	rel="external noopener" target="_blank">donate</a> to support (part of the donations will be forwarded to the above-mentioned projects).</p>
					<p>Sharing on Facebook or Twitter shows some images connected to the selected events.
					I've used public domain pictures wherever possible, and I don't claim any rights on the remaining ones, whose copyright still belongs to their authors/licensees.
					The images are used in very low resolution, only for educational and noncommercial purposes.</p>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-primary" data-dismiss="modal">Close</button>
				</div>
			</div>
		</div>
	</div>
	<footer>
		<section class="right">
			A progressive web app from <a href="https://lopo.it"
				rel="author noopener" target="_blank">Lopo.it</a> - v0.9-beta6 - <a href="#"
				data-toggle="modal" data-target="#credits">Credits</a>
		</section>
	</footer>
	<script src="/js/service-worker-registration.js"></script>
	<div id="floating_alert"></div>
</body>
</html>
