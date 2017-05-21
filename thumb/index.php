<?php
$a = is_numeric($_GET['a']) ? $_GET['a'] : false;
$b = is_numeric($_GET['b']) ? $_GET['b'] : false;

$im = new Imagick();

if($a && $b && $im->readImage("$a.png") && $im->readImage("$b.png")){
	
		/* Append the images into one */
		$im->resetIterator();
		$combined = $im->appendImages(false);
	
		/* Output the image */
		$combined->setImageFormat("png");
		$combined->writeImage ($a.'_'.$b.'.png');
		header("Content-Type: image/png");
		echo $combined;

} else {
	die('Error');
}
?>
