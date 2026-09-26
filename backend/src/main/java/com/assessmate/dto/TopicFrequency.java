package com.assessmate.dto;
import lombok.*;

@Data @Builder
@NoArgsConstructor @AllArgsConstructor
public class TopicFrequency {
    private String topic;
    private Long wrongCount;
}
