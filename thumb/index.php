<?php
$a = is_numeric($_GET['a']) ? $_GET['a'] : false;
$b = is_numeric($_GET['b']) ? $_GET['b'] : false;
$c = is_numeric($_GET['c']) ? $_GET['c'] : false;

$im = new Imagick('sharing-img-template.png');

if($a && $b && $c && ($src1 = new Imagick("$a.png")) && ($src2 = new Imagick("$b.png")) && ($src3 = new Imagick("$c.png"))){
	$im = new Imagick('sharing-img-template-3.png');
	/* Append the images into one */
	//$im->resetIterator();
	//$combined = $im->appendImages(false);
	
	$src1->resizeImage(270, 270, Imagick::FILTER_LANCZOS, 1);
	$src2->resizeImage(270, 270, Imagick::FILTER_LANCZOS, 1);
	$src3->resizeImage(270, 270, Imagick::FILTER_LANCZOS, 1);
	
	$im->compositeImage($src1, Imagick::COMPOSITE_DEFAULT, 65, 200);
	$im->compositeImage($src2, Imagick::COMPOSITE_DEFAULT, 465, 200);
	$im->compositeImage($src3, Imagick::COMPOSITE_DEFAULT, 865, 200);
	
	/* Output the image */
	$im->setImageFormat("png");
	$im->writeImage ($a.'_'.$b.'_'.$c.'.png');
	header("Content-Type: image/png");
	echo $im;
	
	
} else if($a && $b && ($src1 = new Imagick("$a.png")) && ($src2 = new Imagick("$b.png")) ){	
	$im = new Imagick('sharing-img-template.png');
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

} else if($a && ($src1 = new Imagick("$a.png")) ){
	$im = new Imagick('sharing-img-template-1.png');
	/* Append the images into one */
	//$im->resetIterator();
	//$combined = $im->appendImages(false);
	
	$src1->resizeImage(370, 370, Imagick::FILTER_LANCZOS, 1);
	
	$im->compositeImage($src1, Imagick::COMPOSITE_DEFAULT, 415, 150);
	
	/* Output the image */
	$im->setImageFormat("png");
	$im->writeImage ($a.'_.png');
	header("Content-Type: image/png");
	echo $im;
	
} else{
	die('Error');
}
?>
