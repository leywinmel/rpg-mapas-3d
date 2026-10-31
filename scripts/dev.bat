@echo off
rem ============================================================
rem  dev.bat - controle do ambiente local (Windows)
rem  Uso:  scripts\dev.bat [start^|stop^|restart^|status^|logs]
rem  start: sobe o Supabase local (Docker), gera o .env.local com as
rem         chaves locais e abre o site em http://localhost:5173
rem ============================================================
setlocal
cd /d "%~dp0\.."

set "ACAO=%~1"
if "%ACAO%"=="" set "ACAO=start"

if /i "%ACAO%"=="start"   goto start
if /i "%ACAO%"=="stop"    goto stop
if /i "%ACAO%"=="restart" goto restart
if /i "%ACAO%"=="status"  goto status
if /i "%ACAO%"=="logs"    goto logs

echo Uso: scripts\dev.bat [start^|stop^|restart^|status^|logs]
exit /b 1

:checar_docker
docker info >nul 2>&1
if errorlevel 1 (
  echo [erro] O Docker nao esta rodando. Abra o Docker Desktop, espere ficar verde e tente de novo.
  exit /b 1
)
exit /b 0

:subir_banco
call :checar_docker || exit /b 1
if not exist node_modules call npm install || exit /b 1
call npx supabase start || exit /b 1
call npx supabase status -o env --override-name api.url=VITE_SUPABASE_URL --override-name auth.anon_key=VITE_SUPABASE_ANON_KEY | findstr /B "VITE_" > .env.local
echo [ok] Supabase local no ar. Painel do banco: http://127.0.0.1:54323
exit /b 0

:start
call :subir_banco || exit /b 1
call npm run dev
goto fim

:stop
call npx supabase stop
goto fim

:restart
call npx supabase stop
call :subir_banco || exit /b 1
call npm run dev
goto fim

:status
call npx supabase status
goto fim

:logs
docker ps --filter "name=supabase_" --format "table {{.Names}}\t{{.Status}}"
goto fim

:fim
endlocal
