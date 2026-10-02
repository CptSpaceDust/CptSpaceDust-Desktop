!macro customInit
  ${if} ${isUpdated}
    ; NSIS owns the update lifetime. The small native animation remains alive
    ; after Electron exits, without keeping installed application files open.
    SetSilent silent
    InitPluginsDir
    File /oname=$PLUGINSDIR\UpdateAnimation.exe "${BUILD_RESOURCES_DIR}\UpdateAnimation.exe"
    System::Call 'kernel32::GetCurrentProcessId() i .r0'
    Exec '"$PLUGINSDIR\UpdateAnimation.exe" $0'
  ${endif}
!macroend
