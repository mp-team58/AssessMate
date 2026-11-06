package com.assessmate.controller;

import com.assessmate.dto.QuestionExpireResponse;
import com.assessmate.service.CandidateService;
import com.assessmate.service.ProctoringService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;

import java.security.Principal;
import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CandidateController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(com.assessmate.exception.GlobalExceptionHandler.class)
class CandidateControllerTimerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private CandidateService candidateService;

    @MockBean
    private ProctoringService proctoringService;

    @MockBean
    private com.assessmate.security.ClientIpResolver clientIpResolver;

    @MockBean
    private com.assessmate.security.JwtFilter jwtFilter;

    @MockBean
    private com.assessmate.security.JwtUtil jwtUtil;

    private final Principal mockPrincipal = new UsernamePasswordAuthenticationToken("candidate@example.com", "pass");

    @Test
    @DisplayName("POST /exam/{enrollmentId}/questions/{questionId}/expire returns QuestionExpireResponse")
    void testExpireQuestionEndpoint() throws Exception {
        QuestionExpireResponse res = QuestionExpireResponse.builder()
                .expiredQuestionId(1L)
                .nextQuestionId(2L)
                .nextQuestionDeadline(LocalDateTime.now().plusSeconds(60))
                .nextQuestionRemainingSeconds(60L)
                .isExamCompleted(false)
                .serverTime(LocalDateTime.now())
                .build();

        when(candidateService.expireQuestion(eq(100L), eq(1L), eq("candidate@example.com")))
                .thenReturn(res);

        mockMvc.perform(post("/api/candidate/exam/100/questions/1/expire")
                .principal(mockPrincipal)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.expiredQuestionId").value(1))
                .andExpect(jsonPath("$.nextQuestionId").value(2))
                .andExpect(jsonPath("$.nextQuestionRemainingSeconds").value(60))
                .andExpect(jsonPath("$.isExamCompleted").value(false));
    }

    @Test
    @DisplayName("POST /exam/{enrollmentId}/questions/{questionId}/advance returns QuestionExpireResponse")
    void testAdvanceQuestionEndpoint() throws Exception {
        QuestionExpireResponse res = QuestionExpireResponse.builder()
                .expiredQuestionId(1L)
                .nextQuestionId(2L)
                .nextQuestionDeadline(LocalDateTime.now().plusSeconds(60))
                .nextQuestionRemainingSeconds(60L)
                .isExamCompleted(false)
                .serverTime(LocalDateTime.now())
                .build();

        when(candidateService.advanceQuestion(eq(100L), eq(1L), eq("candidate@example.com")))
                .thenReturn(res);

        mockMvc.perform(post("/api/candidate/exam/100/questions/1/advance")
                .principal(mockPrincipal)
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.expiredQuestionId").value(1))
                .andExpect(jsonPath("$.nextQuestionId").value(2));
    }
}
