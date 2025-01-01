# 设置 Windows 7 兼容性
ManifestDPIAware true
ManifestSupportedOS all

!macro customInit
  # 检查系统版本
  ${If} ${AtLeastWin7}
    # Windows 7 或更高版本
  ${Else}
    MessageBox MB_OK|MB_ICONSTOP "此应用程序需要 Windows 7 或更高版本。"
    Abort
  ${EndIf}
!macroend 