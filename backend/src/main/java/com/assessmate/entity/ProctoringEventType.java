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
    SCREEN_SHARE_STOPPED   // candidate stopped sharing screen
}
