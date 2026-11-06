package com.assessmate.dto;

import com.assessmate.entity.DeviceAccess;
import com.assessmate.entity.TimerType;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class CandidateExamQuestionsResponse {
    private List<CandidateQuestionDTO> questions;
    private LocalDateTime personalEndTime;
    private Long remainingSeconds;
    private DeviceAccess deviceAccess;

    // P3.5.9: Per-Question Timing Extensions
    private TimerType timerType;
    private Integer easySeconds;
    private Integer mediumSeconds;
    private Integer hardSeconds;
    private LocalDateTime serverTime;
    private Long activeQuestionId;
    private LocalDateTime activeQuestionDeadline;
    private Long activeQuestionRemainingSeconds;

    // Proctoring Policy Enforcement
    private Boolean requireCamera;
    private Boolean requireMic;
    private Boolean requireScreenShare;
    private Boolean enableFaceDetection;
    private Boolean enableObjectDetection;
    private Boolean enableTabSwitchDetection;
    private Boolean enableAudioDetection;
    private Boolean enableScreenCaptureProtection;
    private Boolean enableBrowserActivityDetection;
    private Boolean enableExamWatermark;
    private Boolean disableCopy;
    private Boolean disablePaste;
    private Boolean disableCut;
    private Boolean disableRightClick;
    private Boolean restrictBrowserShortcuts;
    private Integer maxTabSwitches;
    private Long currentTabSwitches;
}
