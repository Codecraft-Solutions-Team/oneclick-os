kcmutils_add_qml_kcm(kcm_oneclick_windows SOURCES windowsmodule.cpp windowsmodule.h)
target_link_libraries(kcm_oneclick_windows PRIVATE Qt6::Core Qt6::Gui Qt6::Quick KF6::KCMUtils KF6::CoreAddons)
