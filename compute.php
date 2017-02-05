<?php  
require_once('connection.php');


function pad_left($string, $digits = 2){
	return str_pad($string, $digits, '0', STR_PAD_LEFT);
}

$arr_obj = array();

// populate the events from the DB

for ($i = 0; $i <= 1; $i++){
	$query = $db->real_escape_string($_GET['event_'.$i]);
	$sql = "SELECT * "
		. "FROM events "
		. "WHERE enabled <> 0 AND id = '".$query."'";

	$res = $db->query( $sql );
	if ( erli( $sql, $res, $db ) && ( mysqli_num_rows( $res ) > 0 ) ) {
		$arr_obj[$i] = mysqli_fetch_assoc( $res );
	}  
}

$result = array();
$bol_years_only = true;

if(empty($arr_obj[0]['month']) || empty($arr_obj[1]['month'])){
	// let's use only the years
	$bol_years_only = true;

	// reverse order if first event is more recent
	if($arr_obj[0]['year'] > $arr_obj[1]['year']){
		$arr_obj = array_reverse($arr_obj);
	}

	$total_span = abs(intval(date('Y')) - intval($arr_obj[0]['year']));
	$first_span = abs(intval($arr_obj[0]['year']) - intval($arr_obj[1]['year']));
	$second_span = abs(intval(date('Y')) - intval($arr_obj[1]['year']));

	$percentage = 100*$first_span/$total_span;
	$result['start']['date'] = (intval($arr_obj[0]['year']) < 0)? abs(intval($arr_obj[0]['year'])).' B.C.' : intval($arr_obj[0]['year']);
	$result['middle']['date'] = (intval($arr_obj[1]['year']) < 0)? abs(intval($arr_obj[1]['year'])).' B.C.' : intval($arr_obj[1]['year']);
	$result['now_date'] = date('Y');

	$result['timeline_1'] = $first_span." years";
	$result['timeline_2'] = $second_span." years";
} else {
	$bol_years_only = false;

	$datetime[0] = new DateTime();
	$datetime[0]->setDate(intval($arr_obj[0]['year']), intval($arr_obj[0]['month']), intval($arr_obj[0]['day']));

	$datetime[1] = new DateTime();
	$datetime[1]->setDate(intval($arr_obj[1]['year']), intval($arr_obj[1]['month']), intval($arr_obj[1]['day']));

	// reverse order if first event is more recent
	if($datetime[0] > $datetime[1]){
		$arr_obj = array_reverse($arr_obj);
		$datetime = array_reverse($datetime);
	}

	$datetimenow = new DateTime(date('Y-m-d'));

	$total_span = date_diff($datetimenow,$datetime[0], true);
	$first_span = date_diff($datetime[1],$datetime[0], true);
	$second_span = date_diff($datetime[1],$datetimenow, true);

	$percentage = 100*$first_span->format('%a')/$total_span->format('%a');

	$year_0 = (intval($arr_obj[0]['year']) < 0)? abs(intval($arr_obj[0]['year'])).' B.C.' : intval($arr_obj[0]['year']);
	$year_1 = (intval($arr_obj[1]['year']) < 0)? abs(intval($arr_obj[1]['year'])).' B.C.' : intval($arr_obj[1]['year']);
	
	$result['start']['date'] = date_format($datetime[0], 'F j').', '.$year_0;
	$result['middle']['date'] = date_format($datetime[1], 'F j').', '.$year_1;
	$result['now_date'] = date('F j, Y');

	$result['timeline_1'] = $first_span->format('%a days');
	$result['timeline_2'] = $second_span->format('%a days');
}

$result['start']['id'] = $arr_obj[0]['id'];
$result['start']['description'] = $arr_obj[0]['name'];
$result['start']['category_icon'] = $arr_obj[0]['type'];
$result['start']['size'] = $percentage."%";

$result['middle']['id'] = $arr_obj[1]['id'];
$result['middle']['description'] = $arr_obj[1]['name'];
$result['middle']['category_icon'] = $arr_obj[1]['type'];
$result['middle']['size'] = (100-$percentage)."%";
$result['middle']['verb'] = ($arr_obj[1]['plural'] == 1)? 'are' : 'is' ;

$second_term_of_comparison = ($arr_obj[0]['capitalize_first'] == 1)? $result['start']['description'] : lcfirst($result['start']['description']);


if($percentage > 50){
	$result['header'] = $result['middle']['description']." ".$result['middle']['verb']." closer in time to us than to ".$second_term_of_comparison.".";
	$result['title'] = $result['middle']['description']." ".$result['middle']['verb']." #closerintime to us than to ".$second_term_of_comparison.".";
} else if($percentage < 50){
	$result['header'] = $result['middle']['description']." ".$result['middle']['verb']." closer in time to ".$second_term_of_comparison." than to us.";
	$result['title'] = $result['middle']['description']." ".$result['middle']['verb']." #closerintime to ".$second_term_of_comparison." than to us.";
} else {
	$result['header'] = $result['middle']['description']." ".$result['middle']['verb']." exactly halfway between ".$second_term_of_comparison." and us.";
	$result['title'] = $result['middle']['description']." ".$result['middle']['verb']." is exactly halfway between ".$second_term_of_comparison." and us. #closerintime";
}

echo json_encode($result);
exit();


