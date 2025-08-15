#!/bin/bash

DB_NAME="lms2026"
DB_USER="root"
SQL_FILE="schema_db.txt"

echo "Enter password for MariaDB user '$DB_USER':"
mysql -u "$DB_USER" -p -e "CREATE DATABASE IF NOT EXISTS $DB_NAME;"
mysql -u "$DB_USER" -p "$DB_NAME" < "$SQL_FILE"

echo "✅ Schema imported into database '$DB_NAME'"
