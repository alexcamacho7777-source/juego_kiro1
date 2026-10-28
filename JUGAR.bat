@echo off
title MONSTRU - no cierres esta ventana mientras juegas
cd /d "%~dp0"
echo.
echo   Iniciando MONSTRU...
echo   Tu navegador se abrira solo en unos segundos.
echo   Deja esta ventana abierta mientras juegas.
echo.
node server.js
pause
