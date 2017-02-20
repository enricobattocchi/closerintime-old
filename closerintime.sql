DROP TABLE IF EXISTS `events`;
CREATE TABLE `events` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `year` smallint(6) NOT NULL,
  `month` tinyint(3) unsigned DEFAULT NULL,
  `day` tinyint(3) unsigned DEFAULT NULL,
  `type` enum('music','film','building','book','history','science','art','computer','sport','submitted') NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `plural` tinyint(1) NOT NULL DEFAULT '0',
  `link` varchar(255) DEFAULT NULL,
  `uuid` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  FULLTEXT KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


DELIMITER ;;

CREATE TRIGGER `events_bi` BEFORE INSERT ON `events` FOR EACH ROW
BEGIN
IF NEW.uuid = NULL THEN
SET NEW.uuid = UUID();
END IF;
END;;

DELIMITER ;
