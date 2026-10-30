-- ============================================================
-- 留言板表结构（MySQL 8+）
-- 使用：mysql -u root -p < server/schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS rhine_home
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE rhine_home;

CREATE TABLE IF NOT EXISTS guest_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(24) NOT NULL COMMENT '留言者名字',
  content VARCHAR(120) NOT NULL COMMENT '留言内容',
  ip_hash CHAR(64) NULL COMMENT 'IP 哈希（防刷预留，可空）',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_created_at (created_at)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;
