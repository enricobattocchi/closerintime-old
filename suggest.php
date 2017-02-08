<?php  
require_once('connection.php');

if (empty($_POST['arr'])){
	return false;
	exit;
}

$array = json_decode($_POST['arr']);
$suggestions = array();

foreach ($array as $suggestion){
	$name = $db->real_escape_string($suggestion->name);
	$year = $db->real_escape_string($suggestion->year);
	$month = $suggestion->month ? $db->real_escape_string($suggestion->month) : 'NULL';
	$day = $suggestion->day ? $db->real_escape_string($suggestion->month) : 'NULL';
	
	$suggestions[] = "( '$name', $year, $month, $day, 'person', '0', '' )";
}

$result ='';

$sql = "INSERT INTO events (`name`, `year`, `month`, `day`, `type`, `enabled`, `link`) VALUES "
		. implode(' , ', $suggestions);

$res = $db->query( $sql );
if ( erli( $sql, $res, $db ) ) {
	$result = 1;
} else {
	$result = 0;
}

echo $result;
		
		