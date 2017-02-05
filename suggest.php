<?php  
require_once('connection.php');

$name = $_POST['name'];
$year = $_POST['year'];
$month = $_POST['month'] ? $_POST['month'] : 'NULL';
$day = $_POST['day'] ? $_POST['month'] : 'NULL';

$result ='';

$sql = "INSERT INTO events (`name`, `year`, `month`, `day`, `type`, `enabled`, `link`) VALUES "
		. "( '$name', $year, $month, $day, 'person', '0', '' );";

$res = $db->query( $sql );
if ( erli( $sql, $res, $db ) ) {
	$result = "Suggestion sent, thank you";
} else {
	$result = "There's been something wrong.";
}

echo $result;
