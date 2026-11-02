package com.assessmate.controller;

import com.assessmate.dto.*;
import com.assessmate.entity.AccountStatus;
import com.assessmate.entity.ExamStatus;
import com.assessmate.entity.Role;
import com.assessmate.security.ClientIpResolver;
import com.assessmate.service.AdminService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final ClientIpResolver clientIpResolver;

    @GetMapping("/dashboard")
    public ResponseEntity<AdminDashboardStatsResponse> getDashboardStats() {
        return ResponseEntity.ok(adminService.getDashboardStats());
    }

    @GetMapping("/users")
    public ResponseEntity<Page<AdminUserRowDTO>> getUsers(
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) AccountStatus status,
            @RequestParam(required = false) String q,
            @RequestParam(required = false, defaultValue = "false") Boolean includeDeleted,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "desc") String dir
    ) {
        Sort.Direction direction = "asc".equalsIgnoreCase(dir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sort));
        return ResponseEntity.ok(adminService.getUsers(role, status, q, includeDeleted, pageable));
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<AdminUserDetailResponse> getUserDetail(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.getUserDetail(id));
    }

    @GetMapping("/hosts")
    public ResponseEntity<Page<AdminUserRowDTO>> getHosts(
            @RequestParam(required = false) AccountStatus status,
            @RequestParam(required = false) String q,
            @RequestParam(required = false, defaultValue = "false") Boolean includeDeleted,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(adminService.getUsers(Role.HOST, status, q, includeDeleted, pageable));
    }

    @GetMapping("/candidates")
    public ResponseEntity<Page<AdminUserRowDTO>> getCandidates(
            @RequestParam(required = false) AccountStatus status,
            @RequestParam(required = false) String q,
            @RequestParam(required = false, defaultValue = "false") Boolean includeDeleted,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(adminService.getUsers(Role.CANDIDATE, status, q, includeDeleted, pageable));
    }

    @GetMapping("/admins")
    public ResponseEntity<Page<AdminUserRowDTO>> getAdmins(
            @RequestParam(required = false) AccountStatus status,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(adminService.getUsers(Role.ADMIN, status, q, false, pageable));
    }

    @GetMapping("/exams")
    public ResponseEntity<Page<AdminExamRowDTO>> getExams(
            @RequestParam(required = false) ExamStatus status,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "desc") String dir
    ) {
        Sort.Direction direction = "asc".equalsIgnoreCase(dir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sort));
        return ResponseEntity.ok(adminService.getExams(status, q, pageable));
    }

    @GetMapping("/exams/{id}")
    public ResponseEntity<AdminExamDetailResponse> getExamDetail(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.getExamDetail(id));
    }

    @PatchMapping("/exams/{id}/suspend")
    public ResponseEntity<Map<String, String>> suspendExam(
            @PathVariable Long id,
            Principal principal,
            HttpServletRequest request
    ) {
        String clientIp = clientIpResolver.resolveClientIp(request);
        adminService.suspendExam(id, principal.getName(), clientIp);
        return ResponseEntity.ok(Map.of("message", "Exam has been suspended / ended."));
    }

    @PatchMapping("/users/{id}/status")
    public ResponseEntity<Map<String, String>> updateUserStatus(
            @PathVariable Long id,
            @Valid @RequestBody UserStatusUpdateRequest body,
            Principal principal,
            HttpServletRequest request
    ) {
        String clientIp = clientIpResolver.resolveClientIp(request);
        adminService.updateUserStatus(id, body.getStatus(), principal.getName(), clientIp);
        return ResponseEntity.ok(Map.of("message", "User status updated to " + body.getStatus()));
    }

    @PostMapping("/admins")
    public ResponseEntity<CreateAdminResponse> createAdmin(
            @Valid @RequestBody CreateAdminRequest body,
            Principal principal,
            HttpServletRequest request
    ) {
        String clientIp = clientIpResolver.resolveClientIp(request);
        return ResponseEntity.ok(adminService.createAdmin(body, principal.getName(), clientIp));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Map<String, String>> deleteUser(
            @PathVariable Long id,
            Principal principal,
            HttpServletRequest request
    ) {
        String clientIp = clientIpResolver.resolveClientIp(request);
        adminService.deleteUser(id, principal.getName(), clientIp);
        return ResponseEntity.ok(Map.of("message", "Account successfully deleted and anonymized."));
    }

    @GetMapping("/activity")
    public ResponseEntity<Page<AdminAuditLogRowDTO>> getActivityLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(adminService.getActivityLogs(pageable));
    }

    @GetMapping("/profile")
    public ResponseEntity<ProfileResponse> getAdminProfile(Principal principal) {
        return ResponseEntity.ok(adminService.getAdminProfile(principal.getName()));
    }

    @PatchMapping("/profile")
    public ResponseEntity<ProfileResponse> updateAdminProfile(
            @Valid @RequestBody AdminProfileUpdateRequest request,
            Principal principal,
            HttpServletRequest httpRequest
    ) {
        String clientIp = clientIpResolver.resolveClientIp(httpRequest);
        return ResponseEntity.ok(adminService.updateAdminProfile(principal.getName(), request, clientIp));
    }
}
