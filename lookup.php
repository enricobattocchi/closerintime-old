<?php  
require_once('connection.php');

$query = $db->real_escape_string($_GET['query']);

if(strpos($query, '–')  !== false){
	$query = reset(explode(' – ', $query));
}

if(is_array($_GET['exclude'])){
	$exclude = array_filter($_GET['exclude']);
}
if(!empty($exclude)){
	$exclude = $db->real_escape_string(array_pop($exclude));
}

$result = array();

$whr = '';

if($exclude){
	$whr .= "AND (id != '".$exclude."') ";
}

if($query){
	$whr .= "AND ((name LIKE '%".$query."%') OR (year = '".$query."') OR (CONCAT_WS(' – ', name, year) = '".$query."') OR (type LIKE '%".$query."%')) ORDER BY rand() LIMIT 20";
} else {
	$whr .= 'ORDER BY id ASC';
}

$sql = "SELECT id, name, year, month, day, type, link, plural, uuid "
		. "FROM events "
		. "WHERE enabled <> 0 ".
		$whr;

$res = $db->query( $sql );
if ( erli( $sql, $res, $db ) && ( mysqli_num_rows( $res ) > 0 ) ) {
	while( $row = mysqli_fetch_assoc( $res )){
		/*if ($row['year'] < 0){
			$row['year'] = -$row['year'].' B.C.';
		}*/
		$result[] = $row;
	}
	
}  

echo json_encode($result);

?>