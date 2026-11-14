add_executable(oneclick-crash-dialog
    main.cpp
    crashcontroller.cpp
    crashcontroller.h
    crash.qrc
)
set_target_properties(oneclick-crash-dialog PROPERTIES AUTORCC ON)
target_link_libraries(oneclick-crash-dialog PRIVATE
    Qt6::Core
    Qt6::Gui
    Qt6::Qml
    Qt6::Quick
)
install(TARGETS oneclick-crash-dialog RUNTIME DESTINATION libexec)
