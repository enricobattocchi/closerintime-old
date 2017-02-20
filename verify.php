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

$results = array();

foreach ($array as $uuid){

	$sql = "SELECT count(id) as count "
			. "FROM events "
			. "WHERE uuid = '".$uuid."'";

	$res = $db->query( $sql );
	if ( erli( $sql, $res, $db ) && ( mysqli_num_rows( $res ) > 0 ) ) {
		while( $row = mysqli_fetch_assoc( $res )){
			$results[$uuid] = $row['count'];
		}
	}
}

echo json_encode($results);

?>