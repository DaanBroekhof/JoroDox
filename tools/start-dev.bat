PowerShell -NoProfile -ExecutionPolicy Bypass -Command "Start-Job -name JorodoxDev { Set-Location $using:PWD; yarn run dev }"