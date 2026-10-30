@echo off
rem One-click WeChat build. Double-click this file, or run: build-wechat.bat -Open
rem Keeps the window open so you can read the result.
cd /d "%~dp0"
set NOPAUSE=
if /I "%~1"=="-nopause" set NOPAUSE=1
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\build-wechat.ps1" %*
if not defined NOPAUSE pause
