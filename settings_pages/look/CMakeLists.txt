kcmutils_add_qml_kcm(kcm_oneclick_look SOURCES lookmodule.cpp lookmodule.h)
target_link_libraries(kcm_oneclick_look PRIVATE Qt6::Core Qt6::Quick KF6::KCMUtils KF6::CoreAddons)
