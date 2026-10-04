@echo off
title Initialize MySQL Database - secure_banking
echo =====================================================================
echo  INITIALIZE MYSQL DATABASE FOR SECURE ONLINE BANKING SYSTEM
echo =====================================================================
echo.
echo This script will execute database/schema.sql on your local MySQL server.
echo Database: secure_banking
echo.
set /p MYSQL_USER=Enter MySQL Username (press Enter for 'root'): 
if "%MYSQL_USER%"=="" set MYSQL_USER=root

echo.
echo Executing database/schema.sql ...
mysql -u %MYSQL_USER% -p < "%~dp0schema.sql"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Database 'secure_banking' and all tables were created successfully!
    echo Tables created:
    echo  - users
    echo  - accounts
    echo  - transactions
    echo  - login_attempts
) else (
    echo.
    echo [ERROR] MySQL execution failed. Please ensure MySQL server is running.
)
echo.
pause
