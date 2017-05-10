<?php

$im = new Imagick();

$im->readImage('89.png');
$im->readImage('90.png');

/* Append the images into one */
$im->resetIterator();
$combined = $im->appendImages();

/* Output the image */
$combined->setImageFormat("png");
header("Content-Type: image/png");
echo $combined;
?>
