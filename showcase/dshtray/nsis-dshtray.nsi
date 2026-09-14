; DSH 鲸鱼托盘 v2.0.2 自包含安装包（NSIS）
Unicode true
!define APPNAME "DSH 鲸鱼托盘"
!define STAGE "M:\Agent\DshTray\showcase\dshtray\nsis-stage"

Name "${APPNAME} v2.0.2"
OutFile "M:\Agent\DshTray\showcase\dshtray\DshTray-v2.0.2-Setup.exe"
InstallDir "$LOCALAPPDATA\DshTray"
InstallDirRegKey HKCU "Software\DshTray" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma

VIProductVersion "2.0.2.0"
VIAddVersionKey ProductName "DSH 鲸鱼托盘"
VIAddVersionKey FileDescription "DSH 鲸鱼托盘安装包（全自包含运行时：node + dsh）"
VIAddVersionKey FileVersion "2.0.2.0"
VIAddVersionKey ProductVersion "2.0.2.0"
VIAddVersionKey LegalCopyright "Copyright (C) 2026"

Page directory
Page instfiles

Section "install"
  SetOutPath "$INSTDIR"

  ; 主程序与一键启动脚本
  File "${STAGE}\DshTray.exe"
  File "${STAGE}\安装并运行.bat"

  ; 自包含运行时（node + dsh，已裁非 x64 平台二进制）
  SetOutPath "$INSTDIR\app\node"
  File /r "${STAGE}\app\node\*.*"
  SetOutPath "$INSTDIR\app\dsh"
  File /r "${STAGE}\app\dsh\*.*"

  ; 用户状态目录（首次启动自动生成内容）
  CreateDirectory "$INSTDIR\app\home"
  CreateDirectory "$INSTDIR\app\logs"

  ; 记住安装目录
  WriteRegStr HKCU "Software\DshTray" "InstallDir" "$INSTDIR"

  ; 完成后自动运行
  Exec '"$INSTDIR\DshTray.exe"'
SectionEnd
