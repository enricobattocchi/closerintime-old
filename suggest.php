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
		$ip = inet_pton(determineIP());
	
		
		$suggestions = "( '$name', $year, $month, $day, '$type', '0', '', '$uuid', '$ip' )";
		
		$sql = "INSERT INTO suggestions (`name`, `year`, `month`, `day`, `type`, `enabled`, `link`, `uuid`, `ip`) VALUES " . $suggestions;
		
		$res = $db->query( $sql );
		
		if ( erli( $sql, $res, $db ) ) {
			$result[] = $uuid;
		}		
	}
}

echo json_encode($result);


function checkIP($ip) {
	if (!empty($ip) && inet_pton($ip) != false) {
		return true;
	} else {
		return false;
	}
}


function determineIP() {
	if (checkIP($_SERVER["HTTP_CLIENT_IP"])) {
		return $_SERVER["HTTP_CLIENT_IP"];
	}
	foreach (explode(",",$_SERVER["HTTP_X_FORWARDED_FOR"]) as $ip) {
		if (checkIP(trim($ip))) {
			return $ip;
		}
	}
	if (checkIP($_SERVER["HTTP_X_FORWARDED"])) {
		return $_SERVER["HTTP_X_FORWARDED"];
	} elseif (checkIP($_SERVER["HTTP_X_CLUSTER_CLIENT_IP"])) {
		return $_SERVER["HTTP_X_CLUSTER_CLIENT_IP"];
	} elseif (checkIP($_SERVER["HTTP_FORWARDED_FOR"])) {
		return $_SERVER["HTTP_FORWARDED_FOR"];
	} elseif (checkIP($_SERVER["HTTP_FORWARDED"])) {
		return $_SERVER["HTTP_FORWARDED"];
	} else {
		return $_SERVER["REMOTE_ADDR"];
	}
}
