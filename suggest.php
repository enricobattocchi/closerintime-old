<?php  
require_once('connection.php');
$input = urldecode(file_get_contents('php://input'));

if (empty($input)){
	return false;
	exit;
}

$array = json_decode($input);
if(!is_array($array)){
	$array = array($array);
}

$result = array();
if(count($array) > 0){
	foreach ($array as $suggestion){
		$name = $db->real_escape_string($suggestion->name);
		$year = $db->real_escape_string($suggestion->year);
		$month = $suggestion->month ? $db->real_escape_string($suggestion->month) : 'NULL';
		$day = $suggestion->day ? $db->real_escape_string($suggestion->day) : 'NULL';
		$uuid = $suggestion->uuid ? $db->real_escape_string($suggestion->uuid) : 'NULL';
		$type = $suggestion->type ? $db->real_escape_string($suggestion->type) : 'NULL';
	
		
		$suggestions = "( '$name', $year, $month, $day, '$type', '0', '', '$uuid' )";
		
		$sql = "INSERT INTO events (`name`, `year`, `month`, `day`, `type`, `enabled`, `link`, `uuid`) VALUES " . $suggestions;
		
		$res = $db->query( $sql );
		
		if ( erli( $sql, $res, $db ) ) {
			$result[] = $uuid;
		}		
	}
}

echo json_encode($result);