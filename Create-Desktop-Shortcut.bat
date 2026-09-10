@echo off
title Create HumanizeAI Desktop Shortcut
cd /d "%~dp0"
powershell.exe -ExecutionPolicy Bypass -NoProfile -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut([System.IO.Path]::Combine([Environment]::GetFolderPath('Desktop'), 'HumanizeAI.lnk')); $Shortcut.TargetPath = '%~dp0START.bat'; $Shortcut.WorkingDirectory = '%~dp0'; $Shortcut.Description = 'Start HumanizeAI Application'; $Shortcut.Save(); Write-Host '✓ Shortcut created on your Desktop: HumanizeAI.lnk' -ForegroundColor Green"
pause
