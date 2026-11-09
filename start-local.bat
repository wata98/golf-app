@echo off
chcp 65001 >nul
rem パソコンでアプリを開いて動作を確認する。
rem このウィンドウを開いている間だけ http://localhost:8000 で見られる。終わるときはウィンドウを閉じる。
rem Python が見つからないときは https://www.python.org/ から入れる（無料）。
cd /d "%~dp0"
set PY="%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
if not exist %PY% set PY=py -3
echo アプリを http://localhost:8000 で開きます。終わるときはこのウィンドウを閉じてください。
start "" http://localhost:8000
%PY% -m http.server 8000 --bind 127.0.0.1
if errorlevel 1 echo Python が見つかりませんでした。README.md の「パソコンで動作を確認する」を見てください。
pause
