package com.assessmate.entity;

public enum ProctoringEventType {
    NO_FACE,
    MULTIPLE_FACES,
    GAZE_AWAY,
    TAB_SWITCH,
    OBJECT_DETECTED,      // phone, book, laptop, etc. seen in frame
    NO_CAMERA,             // camera feed lost/disabled mid-exam
    NO_MIC,                // mic feed lost/disabled mid-exam
    AUDIO_DETECTED,        // voice/noise above threshold
    SCREEN_SHARE_STOPPED,   // candidate stopped sharing screen (legacy)
    FULL_SCREEN_EXIT,       // candidate exited full screen
    WINDOW_BLUR,            // browser window lost focus
    WINDOW_FOCUS,           // browser window regained focus
    SCREENSHOT_ATTEMPT,     // screenshot key combination or PrintScreen detected
    COPY_ATTEMPT,           // unauthorized copy attempt
    PASTE_ATTEMPT,          // unauthorized paste attempt
    CUT_ATTEMPT,            // unauthorized cut attempt
    RIGHT_CLICK_ATTEMPT,    // unauthorized context menu attempt
    SHORTCUT_ATTEMPT        // restricted browser shortcut intercepted
}
