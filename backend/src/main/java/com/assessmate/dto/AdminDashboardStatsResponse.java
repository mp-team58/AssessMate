package com.assessmate.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardStatsResponse {
    private long totalUsers;
    private long totalHosts;
    private long totalCandidates;
    private long totalAdmins;
    private long totalExams;
    private long liveExams;
    private long endedExams;
    private long draftExams;
    private long totalEnrollments;
    private List<Map<String, Object>> userTrend;
    private List<Map<String, Object>> examTrend;
    private List<AdminAuditLogRowDTO> recentActivity;
}
