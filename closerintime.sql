
DROP TABLE IF EXISTS `events`;
CREATE TABLE `events` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `name` text NOT NULL,
  `year` smallint(6) NOT NULL,
  `month` tinyint(3) unsigned DEFAULT NULL,
  `day` tinyint(3) unsigned DEFAULT NULL,
  `type` enum('music','film','building','book','history','science','art','computer','media','sport','submitted') NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `plural` tinyint(1) NOT NULL DEFAULT '0',
  `link` varchar(255) DEFAULT NULL,
  `uuid` varchar(40) DEFAULT NULL,
  `creation_ts` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `editing_ts` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uuid` (`uuid`),
  FULLTEXT KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


DELIMITER ;;

CREATE TRIGGER `events_bi` BEFORE INSERT ON `events` FOR EACH ROW
BEGIN
IF NEW.uuid IS NULL THEN
SET NEW.uuid = UUID();
END IF;
END;;

DELIMITER ;

DROP TABLE IF EXISTS `substitutions`;
CREATE TABLE `substitutions` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `source_uuid` varchar(40) NOT NULL COMMENT 'duplicate UUID',
  `target_uuid` varchar(40) NOT NULL COMMENT 'definitive UUID',
  `request_count` int(2) NOT NULL DEFAULT '0',
  `creation_ts` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `editing_ts` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `source_uuid` (`source_uuid`),
  KEY `target_uuid` (`target_uuid`),
  CONSTRAINT `substitutions_ibfk_1` FOREIGN KEY (`target_uuid`) REFERENCES `events` (`uuid`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


DROP VIEW IF EXISTS `verification_view`;
CREATE TABLE `verification_view` (`uuid` varchar(40), `source_uuid` varchar(40));


DROP TABLE IF EXISTS `verification_view`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `verification_view` AS select `e`.`uuid` AS `uuid`,`s`.`source_uuid` AS `source_uuid` from (`events` `e` left join `substitutions` `s` on((`e`.`uuid` = `s`.`target_uuid`)));
