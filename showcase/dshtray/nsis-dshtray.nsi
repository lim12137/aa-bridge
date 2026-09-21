; DSH 鲸鱼托盘 v2.0.4 自包含安装包（NSIS）
; v2.0.4：本地插件完全项目内——随安装器分发到 app\home\.dsh\local-plugins\，
;         模块解析锚点 junction（app\node_modules）由托盘在拉起 dsh 前自动确保
Unicode true
!define APPNAME "DSH 鲸鱼托盘"
!define STAGE "M:\Agent\DshTray\showcase\dshtray\nsis-stage"

Name "${APPNAME} v2.0.4"
OutFile "M:\Agent\DshTray\showcase\dshtray\DshTray-v2.0.4-Setup.exe"
InstallDir "$LOCALAPPDATA\DshTray"
InstallDirRegKey HKCU "Software\DshTray" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma

VIProductVersion "2.0.4.0"
VIAddVersionKey ProductName "DSH 鲸鱼托盘"
VIAddVersionKey FileDescription "DSH 鲸鱼托盘安装包（全自包含运行时：node + dsh + 本地插件）"
VIAddVersionKey FileVersion "2.0.4.0"
VIAddVersionKey ProductVersion "2.0.4.0"
VIAddVersionKey LegalCopyright "Copyright (C) 2026"

Page directory
Page instfiles

Section "install"
  SetOutPath "$INSTDIR"

  ; 主程序、插件挂载器与一键启动脚本
  SetOutPath "$INSTDIR"
  File "${STAGE}\DshTray.exe"
  File "${STAGE}\安装并运行.bat"
  SetOutPath "$INSTDIR\app"
  File "${STAGE}\app\wire-plugins.mjs"

  ; 自包含运行时（node + dsh，已裁非 x64 平台二进制）
  SetOutPath "$INSTDIR\app\node"
  File /r "${STAGE}\app\node\*.*"
  SetOutPath "$INSTDIR\app\dsh"
  File /r "${STAGE}\app\dsh\*.*"

  ; v2.0.4：本地插件随安装器分发（HOME 已被托盘重定向到 app\home，
  ; dsh 原生约定目录 ~/.dsh/local-plugins 天然落在项目内）
  SetOutPath "$INSTDIR\app\home\.dsh\local-plugins"
  File /r "${STAGE}\app\home\.dsh\local-plugins\*.*"

  ; 用户状态目录（首次启动自动生成内容）
  CreateDirectory "$INSTDIR\app\home"
  CreateDirectory "$INSTDIR\app\logs"

  ; 模块解析锚点 junction（app\node_modules → app\home\.dsh\profiles\node_modules）
  ; 不在此创建：目标森林由 dsh 首启生成，安装器阶段建必悬空且无法提示生效时机；
  ; 托盘每次拉起 dsh 前幂等确保（见 main.aardio ensureModuleAnchor）
  DetailPrint "本地插件已随安装就位：app\home\.dsh\local-plugins"

  ; 记住安装目录
  WriteRegStr HKCU "Software\DshTray" "InstallDir" "$INSTDIR"

  ; 完成后自动运行
  Exec '"$INSTDIR\DshTray.exe"'
SectionEnd
