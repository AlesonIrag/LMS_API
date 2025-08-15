DROP USER IF EXISTS 'lms_user'@'localhost';
CREATE USER 'lms_user'@'localhost' IDENTIFIED BY 'lms2026';
GRANT ALL PRIVILEGES ON dblibrary.* TO 'lms_user'@'localhost';
FLUSH PRIVILEGES;
