package com.assessmate.dto;
import lombok.*;
import java.time.LocalDate;

@Data @Builder
@NoArgsConstructor @AllArgsConstructor
public class PerformanceTrendPoint {
    private LocalDate date;
    private Double averagePercentage;
}
