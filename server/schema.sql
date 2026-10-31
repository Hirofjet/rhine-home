-- ============================================================
-- RHINE//HOME 数据库结构（MySQL 8+）
-- 说明：server/index.mjs 启动时会自动建表（IF NOT EXISTS），
-- 此文件用于手动建库或查看表结构。
-- 使用：mysql -u root -p < server/schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS rhine_home
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE rhine_home;

-- 后台账号（密码为 scrypt 哈希）
CREATE TABLE IF NOT EXISTS admin_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(64) NULL,
  password_hash VARCHAR(255) NULL,
  role VARCHAR(16) NULL,
  permissions JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_username (username)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 文章
CREATE TABLE IF NOT EXISTS articles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(200) NULL,
  date VARCHAR(32) NULL,
  tags JSON NULL,
  markdown MEDIUMTEXT NULL,
  downloads JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 日志
CREATE TABLE IF NOT EXISTS logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(200) NULL,
  date VARCHAR(32) NULL,
  markdown MEDIUMTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 照片（date 为 EXIF 拍摄日期，可为空）
CREATE TABLE IF NOT EXISTS photos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  url VARCHAR(500) NULL,
  name VARCHAR(500) NULL,
  date VARCHAR(32) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 视频
CREATE TABLE IF NOT EXISTS videos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(200) NULL,
  description TEXT NULL,
  tags JSON NULL,
  src VARCHAR(500) NULL,
  poster VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 留言板
CREATE TABLE IF NOT EXISTS guest_messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NULL,
  content VARCHAR(120) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
