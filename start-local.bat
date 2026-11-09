@echo off
rem パソコンでアプリを開いて動作を確認する。
rem このウィンドウを開いている間だけ http://localhost:8000 で見られる。終わるときはウィンドウを閉じる。
cd /d "%~dp0"
start "" http://localhost:8000
"%LOCALAPPDATA%\Programs\Python\Python312\python.exe" -m http.server 8000 --bind 127.0.0.1
pause
