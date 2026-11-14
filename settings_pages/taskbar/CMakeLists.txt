kcmutils_add_qml_kcm(kcm_oneclick_taskbar SOURCES taskbarmodule.cpp taskbarmodule.h)
target_link_libraries(kcm_oneclick_taskbar PRIVATE Qt6::Core Qt6::Quick KF6::KCMUtils KF6::CoreAddons)
