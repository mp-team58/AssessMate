package com.assessmate.controller;

import com.assessmate.dto.SignedUrlResponse;
import com.assessmate.dto.StorageUploadResponse;
import com.assessmate.entity.Role;
import com.assessmate.entity.User;
import com.assessmate.exception.BadRequestException;
import com.assessmate.exception.ForbiddenException;
import com.assessmate.repository.UserRepository;
import com.assessmate.service.storage.StorageAuthorizationService;
import com.assessmate.service.storage.StorageFileNameGenerator;
import com.assessmate.service.storage.StorageFileValidator;
import com.assessmate.service.storage.SupabaseStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.Principal;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/storage")
@RequiredArgsConstructor
public class StorageController {

    private final SupabaseStorageService supabaseStorageService;
    private final StorageFileValidator storageFileValidator;
    private final StorageFileNameGenerator storageFileNameGenerator;
    private final StorageAuthorizationService storageAuthorizationService;
    private final UserRepository userRepository;

    /**
     * Authenticated endpoint to obtain a temporary signed URL for a private media asset.
     */
    @GetMapping("/signed-url")
    public ResponseEntity<SignedUrlResponse> getSignedUrl(
            @RequestParam("objectPath") String objectPath,
            @RequestParam(value = "expiresIn", required = false, defaultValue = "900") int expiresIn,
            Principal principal
    ) {
        if (principal == null || principal.getName() == null) {
            throw new ForbiddenException("Authentication required.");
        }

        if (objectPath == null || objectPath.isBlank()) {
            throw new BadRequestException("objectPath parameter is required.");
        }

        // Enforce entity-based authorization to prevent IDOR vulnerabilities
        storageAuthorizationService.validateReadAccess(objectPath, principal.getName());

        int effectiveExpiresIn = (expiresIn > 0 && expiresIn <= 3600) ? expiresIn : 900;
        String signedUrl = supabaseStorageService.createSignedUrl(objectPath, effectiveExpiresIn);

        return ResponseEntity.ok(SignedUrlResponse.builder()
                .objectPath(objectPath)
                .signedUrl(signedUrl)
                .expiresIn(effectiveExpiresIn)
                .build());
    }

    /**
     * Authenticated general storage upload endpoint.
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<StorageUploadResponse> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam("folder") String folder,
            @RequestParam(value = "entityId", required = false) String entityId,
            Principal principal
    ) throws IOException {
        if (principal == null || principal.getName() == null) {
            throw new ForbiddenException("Authentication required.");
        }

        User user = userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new ForbiddenException("User not found."));

        String cleanFolder = folder != null ? folder.trim().toLowerCase() : "";
        String objectPath;
        StorageFileValidator.ValidatedFile validated;

        if ("questions".equals(cleanFolder)) {
            if (user.getRole() != Role.HOST && user.getRole() != Role.ADMIN) {
                throw new ForbiddenException("Only hosts or administrators can upload question media.");
            }
            // Check if file is image or audio
            String contentType = file.getContentType();
            if (contentType != null && contentType.startsWith("audio/")) {
                validated = storageFileValidator.validateAudio(file);
            } else {
                validated = storageFileValidator.validateImage(file);
            }
            objectPath = storageFileNameGenerator.generateQuestionObjectPath(entityId, validated.extension());

        } else if ("proctoring/image".equals(cleanFolder)) {
            validated = storageFileValidator.validateImage(file);
            objectPath = storageFileNameGenerator.generateProctoringImageObjectPath(
                    entityId != null ? entityId : user.getId(), validated.extension());

        } else if ("proctoring/audio".equals(cleanFolder)) {
            validated = storageFileValidator.validateAudio(file);
            objectPath = storageFileNameGenerator.generateProctoringAudioObjectPath(
                    entityId != null ? entityId : user.getId(), validated.extension());

        } else {
            throw new BadRequestException("Invalid folder. Allowed: 'questions', 'proctoring/image', 'proctoring/audio'");
        }

        byte[] bytes = file.getBytes();
        supabaseStorageService.uploadFile(objectPath, bytes, validated.mimeType());

        int expiresIn = 900;
        String signedUrl = supabaseStorageService.createSignedUrl(objectPath, expiresIn);

        return ResponseEntity.ok(StorageUploadResponse.builder()
                .objectPath(objectPath)
                .signedUrl(signedUrl)
                .expiresIn(expiresIn)
                .mimeType(validated.mimeType())
                .size(file.getSize())
                .build());
    }

    /**
     * Authenticated endpoint to delete an object from storage.
     */
    @DeleteMapping("/object")
    public ResponseEntity<Map<String, String>> deleteObject(
            @RequestParam("objectPath") String objectPath,
            Principal principal
    ) {
        if (principal == null || principal.getName() == null) {
            throw new ForbiddenException("Authentication required.");
        }

        storageAuthorizationService.validateDeleteAccess(objectPath, principal.getName());
        supabaseStorageService.deleteFile(objectPath);

        return ResponseEntity.ok(Map.of("message", "Object deleted successfully", "objectPath", objectPath));
    }
}

