@echo off
chcp 65001 >nul
rem 自動テストを動かす（ダブルクリックで実行）。最後に「fail 0」と出れば全部通っている。
rem Node.js が見つからないときは https://nodejs.org/ から LTS 版を入れる（無料）。
cd /d "%~dp0"
set NODE="C:\Program Files\nodejs\node.exe"
if not exist %NODE% set NODE=node
%NODE% --test
if errorlevel 1 (echo. & echo テストが通らなかったか、Node.js が見つかりませんでした。上の ✖ の行を見てください。) else (echo. & echo すべてのテストが通りました。)
pause
