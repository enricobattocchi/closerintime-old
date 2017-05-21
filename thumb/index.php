<?php
$a = is_numeric($_GET['a']) ? $_GET['a'] : false;
$b = is_numeric($_GET['b']) ? $_GET['b'] : false;

$im = new Imagick('sharing-img-template.png');

if($a && $b && ($src1 = new Imagick("$a.png")) && ($src2 = new Imagick("$b.png")) ){
	
		/* Append the images into one */
		//$im->resetIterator();
		//$combined = $im->appendImages(false);
		
		$src1->resizeImage(370, 370, Imagick::FILTER_LANCZOS, 1);
		$src2->resizeImage(370, 370, Imagick::FILTER_LANCZOS, 1);
	
		$im->compositeImage($src1, Imagick::COMPOSITE_DEFAULT, 116, 150);
		$im->compositeImage($src2, Imagick::COMPOSITE_DEFAULT, 716, 150);
		
		/* Output the image */
		$im->setImageFormat("png");
		$im->writeImage ($a.'_'.$b.'.png');
		header("Content-Type: image/png");
		echo $im;

} else {
	die('Error');
}
?>
