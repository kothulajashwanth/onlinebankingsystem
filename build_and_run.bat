@echo off
title Secure Online Banking and Fund Transfer System - Java Backend Server
echo =====================================================================
echo  SECURE ONLINE BANKING AND FUND TRANSFER SYSTEM
echo  Java Backend + JDBC + MySQL
echo =====================================================================
echo.

cd /d "%~dp0"

:: 1. Ensure lib directory exists
if not exist "lib" mkdir "lib"

:: 2. Check for MySQL Connector/J jar in lib
set "MYSQL_JAR="
for %%f in (lib\mysql-connector-j*.jar lib\mysql-connector-java*.jar) do (
    set "MYSQL_JAR=%%f"
)

if "%MYSQL_JAR%"=="" (
    echo [Setup] MySQL Connector/J driver not found in lib\ folder.
    echo [Setup] Downloading mysql-connector-j-8.4.0.jar from Maven Central...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (New-Object Net.WebClient).DownloadFile('https://repo1.maven.org/maven2/com/mysql/mysql-connector-j/8.4.0/mysql-connector-j-8.4.0.jar', 'lib\mysql-connector-j-8.4.0.jar')"
    set "MYSQL_JAR=lib\mysql-connector-j-8.4.0.jar"
    if exist "lib\mysql-connector-j-8.4.0.jar" (
        echo [Setup] Download complete: lib\mysql-connector-j-8.4.0.jar
    ) else (
        echo [Warning] Automatic download failed. Please place mysql-connector-j-*.jar into the lib\ folder.
    )
)

:: 3. Prepare bin directory
if not exist "bin" mkdir "bin"

:: 4. Compile Java sources
echo.
echo [Build] Compiling Java classes with javac...
set "CP=bin"
if not "%MYSQL_JAR%"=="" set "CP=bin;%MYSQL_JAR%"

dir /s /b src\main\java\*.java > sources.txt
javac -d bin -cp "%CP%" @sources.txt
del sources.txt

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Compilation failed! Please inspect compilation output above.
    pause
    exit /b %ERRORLEVEL%
)

echo [Build] Compilation successful!
echo.

:: 5. Port 8080 Check & Safe Release
echo [Port 8080] Checking if port 8080 is in use...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8080" ^| findstr "LISTENING"') do (
    echo [Port 8080] Stopping previous server instance (PID %%a)...
    taskkill /F /PID %%a >nul 2>&1
    timeout /t 1 /nobreak >nul
)

:: 6. Launch Java Server
echo.
echo [Launch] Starting Java Banking Server on port 8080...
echo [Launch] Database: secure_banking (Config in db.properties)
echo [Launch] Open your browser at: http://localhost:8080/
echo.
echo Press Ctrl+C in this window to stop the server.
echo =====================================================================
echo.

java -cp "%CP%" com.banking.Main

pause
