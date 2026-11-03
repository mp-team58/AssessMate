package com.assessmate.service;

import com.assessmate.repository.AdminInvitationRepository;
import org.springframework.beans.factory.annotation.Value;
import java.util.HexFormat;

import com.assessmate.dto.*;
import com.assessmate.entity.*;
import com.assessmate.exception.BadRequestException;
import com.assessmate.exception.ResourceNotFoundException;
import com.assessmate.repository.AdminAuditLogRepository;
import com.assessmate.repository.ExamEnrollmentRepository;
import com.assessmate.repository.ExamRepository;
import com.assessmate.repository.OtpVerificationRepository;
import com.assessmate.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    private final UserRepository userRepository;
    private final ExamRepository examRepository;
    private final ExamEnrollmentRepository examEnrollmentRepository;
    private final AdminAuditLogRepository auditLogRepository;
    private final AdminAuditService auditService;
    private final OtpVerificationRepository otpRepository;
    private final PasswordEncoder passwordEncoder;
    private final ExamSubmissionService examSubmissionService;
    private final AdminInvitationRepository adminInvitationRepository;
    private final EmailService emailService;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${ADMIN_EMERGENCY_RECOVERY_KEY:}")
    private String emergencyRecoveryKey;

    @Value("${ADMIN_EMERGENCY_RECOVERY_ENABLED:false}")
    private boolean emergencyRecoveryEnabledProperty;


    public AdminDashboardStatsResponse getDashboardStats() {
        long totalUsers = userRepository.count();
        long totalHosts = userRepository.countByRole(Role.HOST);
        long totalCandidates = userRepository.countByRole(Role.CANDIDATE);
        long totalAdmins = userRepository.countByRole(Role.ADMIN);

        long totalExams = examRepository.count();
        long liveExams = examRepository.countByStatus(ExamStatus.LIVE);
        long endedExams = examRepository.countByStatus(ExamStatus.ENDED);
        long draftExams = examRepository.countByStatus(ExamStatus.DRAFT);
        long totalEnrollments = examEnrollmentRepository.count();

        // 7-day real trend calculations
        List<Map<String, Object>> userTrend = new ArrayList<>();
        List<Map<String, Object>> examTrend = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM dd");

        LocalDate today = LocalDate.now();
        for (int i = 6; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            LocalDateTime start = date.atStartOfDay();
            LocalDateTime end = date.atTime(LocalTime.MAX);
            String label = date.format(formatter);

            long usersOnDate = userRepository.countByCreatedAtBetween(start, end);
            long examsOnDate = examRepository.countByCreatedAtBetween(start, end);

            userTrend.add(Map.of("date", label, "count", usersOnDate));
            examTrend.add(Map.of("date", label, "count", examsOnDate));
        }

        // Recent 5 audit activity events
        Page<AdminAuditLog> recentLogsPage = auditLogRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 5));
        List<AdminAuditLogRowDTO> recentActivity = recentLogsPage.getContent().stream()
                .map(l -> AdminAuditLogRowDTO.builder()
                        .id(l.getId())
                        .actorId(l.getActorId())
                        .actorEmail(l.getActorEmail())
                        .action(l.getAction())
                        .targetType(l.getTargetType())
                        .targetId(l.getTargetId())
                        .metadataJson(l.getMetadataJson())
                        .clientIp(l.getClientIp())
                        .createdAt(l.getCreatedAt())
                        .build()
                ).toList();

        return AdminDashboardStatsResponse.builder()
                .totalUsers(totalUsers)
                .totalHosts(totalHosts)
                .totalCandidates(totalCandidates)
                .totalAdmins(totalAdmins)
                .totalExams(totalExams)
                .liveExams(liveExams)
                .endedExams(endedExams)
                .draftExams(draftExams)
                .totalEnrollments(totalEnrollments)
                .userTrend(userTrend)
                .examTrend(examTrend)
                .recentActivity(recentActivity)
                .build();
    }

    public Page<AdminUserRowDTO> getUsers(Role role, AccountStatus status, String query, Boolean includeDeleted, Pageable pageable) {
        String cleanQuery = (query != null && !query.trim().isEmpty()) ? query.trim().toLowerCase(Locale.ROOT) : null;

        Specification<User> spec = (root, q, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (role != null) {
                predicates.add(cb.equal(root.get("role"), role));
            }

            if (Boolean.TRUE.equals(includeDeleted)) {
                if (status != null) {
                    predicates.add(cb.equal(root.get("status"), status));
                }
            } else {
                if (status != null && status == AccountStatus.DELETED) {
                    predicates.add(cb.equal(root.get("status"), AccountStatus.DELETED));
                } else if (status != null) {
                    predicates.add(cb.equal(root.get("status"), status));
                } else {
                    predicates.add(cb.notEqual(root.get("status"), AccountStatus.DELETED));
                }
            }

            if (cleanQuery != null) {
                String likePattern = "%" + cleanQuery + "%";
                Predicate nameLike = cb.like(cb.lower(root.get("name")), likePattern);
                Predicate emailLike = cb.like(cb.lower(root.get("email")), likePattern);
                predicates.add(cb.or(nameLike, emailLike));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<User> page = userRepository.findAll(spec, pageable);
        return page.map(this::mapUserToRow);
    }

    public AdminUserDetailResponse getUserDetail(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Map<String, Object> summary = new HashMap<>();
        if (user.getRole() == Role.HOST) {
            long examsCreated = examRepository.countByHostId(user.getId());
            summary.put("examsCreated", examsCreated);
        } else if (user.getRole() == Role.CANDIDATE) {
            long totalEnrollments = examEnrollmentRepository.countByCandidateId(user.getId());
            long completedExams = examEnrollmentRepository.countByCandidateIdAndStatus(user.getId(), EnrollmentStatus.SUBMITTED);
            summary.put("enrollmentsCount", totalEnrollments);
            summary.put("completedExams", completedExams);
        }

        return AdminUserDetailResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .status(user.getStatus())
                .mustChangePassword(user.getMustChangePassword())
                .createdAt(user.getCreatedAt())
                .deletedAt(user.getDeletedAt())
                .deletedBy(user.getDeletedBy())
                .summary(summary)
                .build();
    }

    public Page<AdminExamRowDTO> getExams(ExamStatus status, String query, Pageable pageable) {
        String cleanQuery = (query != null && !query.trim().isEmpty()) ? query.trim().toLowerCase(Locale.ROOT) : null;

        Specification<Exam> spec = (root, q, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }

            if (cleanQuery != null) {
                String likePattern = "%" + cleanQuery + "%";
                Predicate titleLike = cb.like(cb.lower(root.get("title")), likePattern);
                Predicate codeLike = cb.like(cb.lower(root.get("joinCode")), likePattern);
                predicates.add(cb.or(titleLike, codeLike));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Exam> page = examRepository.findAll(spec, pageable);

        return page.map(exam -> {
            long enrollments = examEnrollmentRepository.countByExamId(exam.getId());
            User host = exam.getHost();
            return AdminExamRowDTO.builder()
                    .id(exam.getId())
                    .title(exam.getTitle())
                    .subject(exam.getSubject())
                    .joinCode(exam.getJoinCode())
                    .status(exam.getStatus())
                    .hostId(host != null ? host.getId() : null)
                    .hostName(host != null ? host.getName() : "Unknown")
                    .hostEmail(host != null ? host.getEmail() : "Unknown")
                    .durationMinutes(exam.getDurationMinutes())
                    .totalQuestions(exam.getTotalQuestions())
                    .enrollmentsCount(enrollments)
                    .scheduledStart(exam.getScheduledStart())
                    .createdAt(exam.getCreatedAt())
                    .build();
        });
    }

    public AdminExamDetailResponse getExamDetail(Long examId) {
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found"));

        long enrollments = examEnrollmentRepository.countByExamId(exam.getId());
        User host = exam.getHost();

        return AdminExamDetailResponse.builder()
                .id(exam.getId())
                .title(exam.getTitle())
                .subject(exam.getSubject())
                .joinCode(exam.getJoinCode())
                .status(exam.getStatus())
                .hostId(host != null ? host.getId() : null)
                .hostName(host != null ? host.getName() : "Unknown")
                .hostEmail(host != null ? host.getEmail() : "Unknown")
                .durationMinutes(exam.getDurationMinutes())
                .totalQuestions(exam.getTotalQuestions())
                .enrollmentsCount(enrollments)
                .scheduledStart(exam.getScheduledStart())
                .createdAt(exam.getCreatedAt())
                .startedAt(exam.getStartedAt())
                .endedAt(exam.getEndedAt())
                .resultsPublished(exam.getResultsPublished())
                .hasCodingSection(exam.getHasCodingSection())
                .passingPercentage(exam.getPassingPercentage())
                .build();
    }

    @Transactional
    public void suspendExam(Long examId, String adminEmail, String clientIp) {
        Exam exam = examRepository.findById(examId)
                .orElseThrow(() -> new ResourceNotFoundException("Exam not found"));

        if (exam.getStatus() != ExamStatus.ENDED) {
            exam.setStatus(ExamStatus.ENDED);
            exam.setEndedAt(LocalDateTime.now());
            examRepository.save(exam);

            // Auto-submit and finalize all ongoing candidate enrollments
            List<ExamEnrollment> ongoing = examEnrollmentRepository.findByExamIdAndStatus(examId, EnrollmentStatus.ONGOING);
            for (ExamEnrollment enrollment : ongoing) {
                try {
                    examSubmissionService.submitExpiredExam(enrollment.getId());
                } catch (Exception e) {
                    log.error("Failed to auto-submit enrollment {} during exam suspension", enrollment.getId(), e);
                }
            }

            User admin = userRepository.findByEmail(adminEmail).orElse(null);
            Long adminId = admin != null ? admin.getId() : null;
            auditService.logAction(
                    adminId,
                    adminEmail,
                    "EXAM_SUSPEND",
                    "EXAM",
                    examId.toString(),
                    String.format("{\"title\":\"%s\", \"joinCode\":\"%s\"}", exam.getTitle(), exam.getJoinCode()),
                    clientIp
            );
        }
    }

    @Transactional
    public void updateUserStatus(Long userId, AccountStatus newStatus, String adminEmail, String clientIp) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.getEmail().equalsIgnoreCase(adminEmail)) {
            throw new BadRequestException("You cannot change your own account status.");
        }

        if (user.getStatus() == AccountStatus.DELETED) {
            throw new BadRequestException("Deleted accounts cannot be modified.");
        }

        if (user.getRole() == Role.ADMIN && newStatus == AccountStatus.DEACTIVATED) {
            long activeAdmins = userRepository.countByRoleAndStatus(Role.ADMIN, AccountStatus.ACTIVE);
            if (activeAdmins <= 1) {
                throw new BadRequestException("Cannot deactivate the last active administrator.");
            }
        }

        user.setStatus(newStatus);
        if (newStatus == AccountStatus.DEACTIVATED) {
            user.setActiveToken(null);
            user.setTokenVersion((user.getTokenVersion() != null ? user.getTokenVersion() : 1L) + 1);
        }
        userRepository.save(user);

        User admin = userRepository.findByEmail(adminEmail).orElse(null);
        Long adminId = admin != null ? admin.getId() : null;
        auditService.logAction(
                adminId,
                adminEmail,
                "USER_STATUS_CHANGE",
                "USER",
                userId.toString(),
                String.format("{\"targetEmail\":\"%s\", \"newStatus\":\"%s\"}", AdminAuditService.maskEmail(user.getEmail()), newStatus),
                clientIp
        );
    }

    @Transactional
    public CreateAdminResponse createAdmin(CreateAdminRequest request, String adminEmail, String clientIp) {
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("An account with this email already exists.");
        }

        User newAdmin = User.builder()
                .name(request.getName().trim())
                .email(email)
                .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                .role(Role.ADMIN)
                .status(AccountStatus.PENDING_INVITATION)
                .mustChangePassword(false)
                .tokenVersion(1L)
                .createdAt(LocalDateTime.now())
                .build();

        User saved = userRepository.save(newAdmin);

        String rawToken = generateSecureToken();
        String tokenHash = hashToken(rawToken);

        adminInvitationRepository.deleteByEmail(email);
        AdminInvitation invitation = AdminInvitation.builder()
                .email(email)
                .tokenHash(tokenHash)
                .expiresAt(LocalDateTime.now().plusMinutes(30))
                .createdAt(LocalDateTime.now())
                .createdBy(adminEmail)
                .build();
        adminInvitationRepository.save(invitation);

        String setupUrl = (frontendUrl != null && !frontendUrl.isEmpty() ? frontendUrl : "http://localhost:5173") + "/admin/setup-password?token=" + rawToken;
        boolean emailDelivered = emailService.sendAdminInvitation(email, saved.getName(), setupUrl);

        User admin = userRepository.findByEmail(adminEmail).orElse(null);
        Long adminId = admin != null ? admin.getId() : null;
        auditService.logAction(
                adminId,
                adminEmail,
                "ADMIN_INVITATION_CREATE",
                "USER",
                saved.getId().toString(),
                String.format("{\"newAdminEmail\":\"%s\", \"emailDelivered\":%b}", AdminAuditService.maskEmail(email), emailDelivered),
                clientIp
        );

        return CreateAdminResponse.builder()
                .id(saved.getId())
                .name(saved.getName())
                .email(saved.getEmail())
                .invitationSent(true)
                .emailDelivered(emailDelivered)
                .deliveryStatus(emailDelivered ? "DELIVERED" : (emailService.isMailConfigured() ? "FAILED" : "SMTP_NOT_CONFIGURED"))
                .message(emailDelivered
                        ? "Administrator invitation email sent successfully. The user must complete password setup within 30 minutes."
                        : "Administrator account provisioned, but invitation email could not be delivered. Please verify SMTP settings or resend.")
                .build();
    }

    public static String hashToken(String rawToken) {
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(rawToken.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 hashing failed", e);
        }
    }

    private String generateSecureToken() {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    @Transactional
    public Map<String, Object> resendInvitation(Long adminId, String adminEmail, String clientIp) {
        User targetAdmin = userRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Administrator not found"));

        if (targetAdmin.getRole() != Role.ADMIN) {
            throw new BadRequestException("Target user is not an administrator.");
        }

        if (targetAdmin.getStatus() != AccountStatus.PENDING_INVITATION) {
            throw new BadRequestException("Invitation can only be sent for pending administrator accounts.");
        }

        // Rate limit: 60s cooldown
        Optional<AdminInvitation> lastInv = adminInvitationRepository.findTopByEmailOrderByCreatedAtDesc(targetAdmin.getEmail());
        if (lastInv.isPresent() && lastInv.get().getCreatedAt().plusSeconds(60).isAfter(LocalDateTime.now())) {
            throw new BadRequestException("Please wait 60 seconds before requesting another invitation.");
        }

        adminInvitationRepository.deleteByEmail(targetAdmin.getEmail());

        String rawToken = generateSecureToken();
        String tokenHash = hashToken(rawToken);

        AdminInvitation invitation = AdminInvitation.builder()
                .email(targetAdmin.getEmail())
                .tokenHash(tokenHash)
                .expiresAt(LocalDateTime.now().plusMinutes(30))
                .createdAt(LocalDateTime.now())
                .createdBy(adminEmail)
                .build();
        adminInvitationRepository.save(invitation);

        String setupUrl = (frontendUrl != null && !frontendUrl.isEmpty() ? frontendUrl : "http://localhost:5173") + "/admin/setup-password?token=" + rawToken;
        boolean emailDelivered = emailService.sendAdminInvitation(targetAdmin.getEmail(), targetAdmin.getName(), setupUrl);

        User admin = userRepository.findByEmail(adminEmail).orElse(null);
        Long adminIdVal = admin != null ? admin.getId() : null;
        auditService.logAction(
                adminIdVal,
                adminEmail,
                "ADMIN_INVITATION_RESEND",
                "USER",
                targetAdmin.getId().toString(),
                String.format("{\"targetEmail\":\"%s\", \"emailDelivered\":%b}", AdminAuditService.maskEmail(targetAdmin.getEmail()), emailDelivered),
                clientIp
        );

        return Map.of(
                "message", emailDelivered ? "Invitation email resent successfully." : "Invitation re-generated, but email delivery failed.",
                "emailDelivered", emailDelivered
        );
    }

    public Map<String, Object> validateInvitationToken(String rawToken) {
        if (rawToken == null || rawToken.trim().isEmpty()) {
            throw new BadRequestException("Invitation token is required.");
        }

        String tokenHash = hashToken(rawToken.trim());
        AdminInvitation invitation = adminInvitationRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new BadRequestException("Invitation link is invalid or has already been used."));

        if (invitation.isUsed()) {
            throw new BadRequestException("This invitation link has already been used. Please log in or request a new invitation.");
        }

        if (invitation.isExpired()) {
            throw new BadRequestException("This invitation link has expired. Please contact an administrator to resend your invitation.");
        }

        User user = userRepository.findByEmail(invitation.getEmail())
                .orElseThrow(() -> new BadRequestException("Associated administrator account was not found."));

        if (user.getStatus() != AccountStatus.PENDING_INVITATION && user.getStatus() != AccountStatus.ACTIVE) {
            throw new BadRequestException("This account is not eligible for password setup.");
        }

        return Map.of(
                "valid", true,
                "email", invitation.getEmail(),
                "name", user.getName()
        );
    }

    @Transactional
    public Map<String, String> setupAdminPassword(AdminSetupPasswordRequest req, String clientIp) {
        String tokenHash = hashToken(req.getToken().trim());
        AdminInvitation invitation = adminInvitationRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new BadRequestException("Invitation link is invalid or has already been used."));

        if (invitation.isUsed()) {
            throw new BadRequestException("This invitation link has already been used. Please log in.");
        }

        if (invitation.isExpired()) {
            throw new BadRequestException("This invitation link has expired. Please request a new invitation.");
        }

        User user = userRepository.findByEmail(invitation.getEmail())
                .orElseThrow(() -> new BadRequestException("Associated administrator account not found."));

        if (user.getStatus() == AccountStatus.DELETED || user.getStatus() == AccountStatus.DEACTIVATED) {
            throw new BadRequestException("This administrator account has been disabled.");
        }

        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        user.setStatus(AccountStatus.ACTIVE);
        user.setMustChangePassword(false);
        user.setActiveToken(null);
        user.setTokenVersion((user.getTokenVersion() != null ? user.getTokenVersion() : 1L) + 1);
        userRepository.save(user);

        invitation.setUsedAt(LocalDateTime.now());
        adminInvitationRepository.save(invitation);

        auditService.logAction(
                user.getId(),
                user.getEmail(),
                "ADMIN_INVITATION_ACCEPT",
                "USER",
                user.getId().toString(),
                "{\"status\":\"ACTIVE\"}",
                clientIp
        );

        return Map.of("message", "Password created successfully. You may now log in as an administrator.");
    }

    @Transactional
    public Map<String, String> deleteAdmin(Long adminId, AdminDeleteRequest request, String actingAdminEmail, String clientIp) {
        User actingAdmin = userRepository.findByEmail(actingAdminEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Acting administrator not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), actingAdmin.getPassword())) {
            throw new BadRequestException("Incorrect password. Deletion verification failed.");
        }

        User targetAdmin = userRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Target administrator not found"));

        if (targetAdmin.getRole() != Role.ADMIN) {
            throw new BadRequestException("Target account is not an administrator.");
        }

        if (actingAdmin.getId().equals(targetAdmin.getId()) || actingAdmin.getEmail().equalsIgnoreCase(targetAdmin.getEmail())) {
            throw new BadRequestException("You cannot delete your own administrator account.");
        }

        if (targetAdmin.getStatus() == AccountStatus.DELETED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Account is already deleted.");
        }

        long activeAdmins = userRepository.countByRoleAndStatus(Role.ADMIN, AccountStatus.ACTIVE);
        if (activeAdmins <= 1 && targetAdmin.getStatus() == AccountStatus.ACTIVE) {
            throw new BadRequestException("Cannot delete the last active administrator.");
        }

        String originalEmail = targetAdmin.getEmail();

        targetAdmin.setStatus(AccountStatus.DELETED);
        targetAdmin.setDeletedAt(LocalDateTime.now());
        targetAdmin.setDeletedBy(actingAdminEmail);
        targetAdmin.setEmail("deleted-admin-" + targetAdmin.getId() + "@deleted.invalid");
        targetAdmin.setName("Deleted Administrator");
        targetAdmin.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
        targetAdmin.setActiveToken(null);
        targetAdmin.setTokenVersion((targetAdmin.getTokenVersion() != null ? targetAdmin.getTokenVersion() : 1L) + 1);
        userRepository.save(targetAdmin);

        adminInvitationRepository.deleteByEmail(originalEmail);

        auditService.logAction(
                actingAdmin.getId(),
                actingAdminEmail,
                "ADMIN_DELETE",
                "USER",
                adminId.toString(),
                String.format("{\"targetEmail\":\"%s\"}", AdminAuditService.maskEmail(originalEmail)),
                clientIp
        );

        return Map.of("message", "Administrator account successfully deleted and anonymized.");
    }

    public AdminSecurityStatusResponse getAdminSecurityStatus() {
        long totalActiveAdmins = userRepository.countByRoleAndStatus(Role.ADMIN, AccountStatus.ACTIVE);
        boolean singleActiveAdminWarning = totalActiveAdmins <= 1;
        boolean emergencyConfigured = emergencyRecoveryKey != null && !emergencyRecoveryKey.trim().isEmpty();
        boolean emergencyEnabled = emergencyRecoveryEnabledProperty && emergencyConfigured;

        String lastRecoveryEvent = null;
        LocalDateTime lastRecoveryTimestamp = null;
        List<AdminAuditLog> logs = auditLogRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 10)).getContent();
        for (AdminAuditLog l : logs) {
            if ("ADMIN_EMERGENCY_RECOVERY".equals(l.getAction()) || "ADMIN_STATUS_CHANGE".equals(l.getAction())) {
                lastRecoveryEvent = l.getAction() + " on " + l.getTargetType() + " #" + l.getTargetId();
                lastRecoveryTimestamp = l.getCreatedAt();
                break;
            }
        }

        return AdminSecurityStatusResponse.builder()
                .totalActiveAdmins(totalActiveAdmins)
                .singleActiveAdminWarning(singleActiveAdminWarning)
                .emergencyRecoveryConfigured(emergencyConfigured)
                .emergencyRecoveryEnabled(emergencyEnabled)
                .lastRecoveryEvent(lastRecoveryEvent)
                .lastRecoveryTimestamp(lastRecoveryTimestamp)
                .build();
    }

    @Transactional
    public Map<String, String> emergencyRecoverAdmin(EmergencyRecoveryRequest request, String clientIp) {
        if (!emergencyRecoveryEnabledProperty) {
            throw new BadRequestException("Emergency recovery is currently disabled on this system.");
        }

        if (emergencyRecoveryKey == null || emergencyRecoveryKey.trim().isEmpty() || !emergencyRecoveryKey.equals(request.getRecoverySecret())) {
            throw new BadRequestException("Invalid emergency recovery authorization secret.");
        }

        String email = request.getAdminEmail().trim().toLowerCase(Locale.ROOT);
        User targetAdmin = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Administrator account not found."));

        if (targetAdmin.getRole() != Role.ADMIN) {
            throw new BadRequestException("Target account is not an administrator.");
        }

        targetAdmin.setStatus(AccountStatus.ACTIVE);
        targetAdmin.setPassword(passwordEncoder.encode(request.getNewPassword()));
        targetAdmin.setMustChangePassword(true);
        targetAdmin.setActiveToken(null);
        targetAdmin.setTokenVersion((targetAdmin.getTokenVersion() != null ? targetAdmin.getTokenVersion() : 1L) + 1);
        userRepository.save(targetAdmin);

        this.emergencyRecoveryEnabledProperty = false;

        auditService.logAction(
                targetAdmin.getId(),
                targetAdmin.getEmail(),
                "ADMIN_EMERGENCY_RECOVERY",
                "USER",
                targetAdmin.getId().toString(),
                String.format("{\"recoveredEmail\":\"%s\"}", AdminAuditService.maskEmail(email)),
                clientIp
        );

        return Map.of("message", "Emergency recovery completed successfully. Please sign in and update your password.");
    }


    @Transactional
    public void deleteUser(Long userId, String adminEmail, String clientIp) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.getRole() == Role.ADMIN) {
            throw new BadRequestException("Administrators cannot be deleted via this endpoint.");
        }

        if (user.getEmail().equalsIgnoreCase(adminEmail)) {
            throw new BadRequestException("You cannot delete your own account.");
        }

        if (user.getStatus() == AccountStatus.DELETED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Account is already deleted.");
        }

        // Host check: cannot delete host with active LIVE exams
        if (user.getRole() == Role.HOST) {
            boolean hasLiveExams = examRepository.existsByHostIdAndStatus(userId, ExamStatus.LIVE);
            if (hasLiveExams) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot delete host with active LIVE exams. Suspend or end their active exams first.");
            }
        }

        // Candidate check: cannot delete candidate with an ongoing assessment
        if (user.getRole() == Role.CANDIDATE) {
            boolean hasOngoingExam = examEnrollmentRepository.existsByCandidateIdAndStatus(userId, EnrollmentStatus.ONGOING);
            if (hasOngoingExam) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot delete candidate with an ongoing assessment.");
            }
        }

        String originalEmail = user.getEmail();

        // Perform safe anonymization and soft deletion in ONE transaction
        user.setStatus(AccountStatus.DELETED);
        user.setDeletedAt(LocalDateTime.now());
        user.setDeletedBy(adminEmail);
        user.setEmail("deleted-" + user.getId() + "@deleted.invalid");
        user.setName("Deleted User");
        user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
        user.setActiveToken(null);
        user.setTokenVersion((user.getTokenVersion() != null ? user.getTokenVersion() : 1L) + 1);

        try {
            otpRepository.deleteByEmailAndPurpose(originalEmail, OtpPurpose.REGISTER);
            otpRepository.deleteByEmailAndPurpose(originalEmail, OtpPurpose.FORGOT_PASSWORD);
        } catch (Exception ignored) {}

        userRepository.save(user);

        User admin = userRepository.findByEmail(adminEmail).orElse(null);
        Long adminId = admin != null ? admin.getId() : null;
        auditService.logAction(
                adminId,
                adminEmail,
                "USER_DELETE",
                "USER",
                userId.toString(),
                String.format("{\"originalEmail\":\"%s\", \"role\":\"%s\"}", AdminAuditService.maskEmail(originalEmail), user.getRole()),
                clientIp
        );
    }

    public Page<AdminAuditLogRowDTO> getActivityLogs(Pageable pageable) {
        Page<AdminAuditLog> logs = auditLogRepository.findAllByOrderByCreatedAtDesc(pageable);
        return logs.map(l -> AdminAuditLogRowDTO.builder()
                .id(l.getId())
                .actorId(l.getActorId())
                .actorEmail(l.getActorEmail())
                .action(l.getAction())
                .targetType(l.getTargetType())
                .targetId(l.getTargetId())
                .metadataJson(l.getMetadataJson())
                .clientIp(l.getClientIp())
                .createdAt(l.getCreatedAt())
                .build()
        );
    }

    public ProfileResponse getAdminProfile(String adminEmail) {
        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found"));
        return new ProfileResponse(
                admin.getId(),
                admin.getName(),
                admin.getEmail(),
                admin.getRole().name(),
                admin.getCreatedAt()
        );
    }

    @Transactional
    public ProfileResponse updateAdminProfile(String adminEmail, AdminProfileUpdateRequest req, String clientIp) {
        User admin = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found"));

        admin.setName(req.getName().trim());
        userRepository.save(admin);

        auditService.logAction(
                admin.getId(),
                admin.getEmail(),
                "ADMIN_PROFILE_UPDATE",
                "USER",
                admin.getId().toString(),
                String.format("{\"updatedName\":\"%s\"}", admin.getName()),
                clientIp
        );

        return new ProfileResponse(
                admin.getId(),
                admin.getName(),
                admin.getEmail(),
                admin.getRole().name(),
                admin.getCreatedAt()
        );
    }

    private AdminUserRowDTO mapUserToRow(User user) {
        return AdminUserRowDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .status(user.getStatus())
                .mustChangePassword(user.getMustChangePassword())
                .createdAt(user.getCreatedAt())
                .deletedAt(user.getDeletedAt())
                .deletedBy(user.getDeletedBy())
                .build();
    }

    private String generateSecurePassword() {
        final String UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        final String LOWER = "abcdefghijklmnopqrstuvwxyz";
        final String DIGITS = "0123456789";
        final String SPECIAL = "!@#$%^&*()-_+=";
        final String ALL = UPPER + LOWER + DIGITS + SPECIAL;

        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder(16);
        sb.append(UPPER.charAt(random.nextInt(UPPER.length())));
        sb.append(LOWER.charAt(random.nextInt(LOWER.length())));
        sb.append(DIGITS.charAt(random.nextInt(DIGITS.length())));
        sb.append(SPECIAL.charAt(random.nextInt(SPECIAL.length())));

        for (int i = 4; i < 16; i++) {
            sb.append(ALL.charAt(random.nextInt(ALL.length())));
        }

        List<Character> chars = new ArrayList<>();
        for (char c : sb.toString().toCharArray()) {
            chars.add(c);
        }
        Collections.shuffle(chars, random);
        StringBuilder result = new StringBuilder();
        chars.forEach(result::append);
        return result.toString();
    }
}
