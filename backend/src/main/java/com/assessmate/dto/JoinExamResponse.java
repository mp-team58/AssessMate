package com.assessmate.dto;

import com.assessmate.entity.DeviceAccess;
import com.assessmate.entity.TimerType;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class JoinExamResponse {
    private Long enrollmentId;
    private Long examId;
    private String title;
    private String subject;
    private TimerType timerType;
    private Integer durationMinutes;
    private Integer totalQuestions;
    private Boolean hasCodingSection;
    private Boolean negativeMark;
    private Double passingPercentage;
    private DeviceAccess deviceAccess;
    private LocalDateTime personalEndTime;
    private String instructions;
    private Boolean requireCamera;
    private Boolean requireMic;
    private Boolean requireScreenShare;
    private Boolean enableFaceDetection;
    private Boolean enableObjectDetection;
    private Boolean enableTabSwitchDetection;
    private Boolean enableAudioDetection;
    private Integer maxTabSwitches;
}
