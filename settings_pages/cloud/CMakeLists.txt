kcmutils_add_qml_kcm(kcm_oneclick_cloud SOURCES cloudmodule.cpp cloudmodule.h)
target_link_libraries(kcm_oneclick_cloud PRIVATE
    Qt6::Core
    Qt6::Gui
    Qt6::Network
    Qt6::Quick
    KF6::KCMUtils
    KF6::CoreAddons
)
