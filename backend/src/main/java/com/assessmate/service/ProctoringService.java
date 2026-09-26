package com.assessmate.service;

import com.assessmate.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import javax.imageio.ImageIO;
import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProctoringService {

    @Value("${app.upload.dir.proctoring.images:uploads/proctoring/images/}")
    private String imagesUploadDir;

    @Value("${app.upload.dir.proctoring.audio:uploads/proctoring/audio/}")
    private String audioUploadDir;

    public String saveEvidence(MultipartFile file, String type) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Evidence file is empty.");
        }

        try {
            if ("image".equalsIgnoreCase(type)) {
                return saveImage(file);
            } else if ("audio".equalsIgnoreCase(type)) {
                return saveAudio(file);
            } else {
                throw new BadRequestException("Invalid evidence type: " + type);
            }
        } catch (IOException e) {
            throw new BadRequestException("Could not save evidence file: " + e.getMessage());
        }
    }

    private String saveImage(MultipartFile file) throws IOException {
        if (file.getSize() > 2 * 1024 * 1024) {
            throw new BadRequestException("Image too large. Max 2MB.");
        }

        String contentType = file.getContentType();
        if (contentType == null || (!contentType.equals("image/jpeg") && !contentType.equals("image/png") && !contentType.equals("image/webp"))) {
            throw new BadRequestException("Only JPEG, PNG, and WebP images are allowed.");
        }

        try {
            java.awt.image.BufferedImage img = ImageIO.read(file.getInputStream());
            if (img == null) {
                throw new BadRequestException("File is not a valid image.");
            }
        } catch (Exception e) {
            throw new BadRequestException("Could not read image file.");
        }

        Path uploadPath = Paths.get(imagesUploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String extension = switch (contentType) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };

        String filename = UUID.randomUUID().toString() + extension;
        Files.copy(file.getInputStream(), uploadPath.resolve(filename), StandardCopyOption.REPLACE_EXISTING);

        return "/uploads/proctoring/images/" + filename;
    }

    private String saveAudio(MultipartFile file) throws IOException {
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new BadRequestException("Audio too large. Max 5MB.");
        }

        String contentType = file.getContentType();
        if (contentType == null || (!contentType.equals("audio/webm") && !contentType.equals("audio/ogg") && !contentType.equals("audio/wav"))) {
            throw new BadRequestException("Only WebM, OGG, and WAV audio are allowed.");
        }

        Path uploadPath = Paths.get(audioUploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String extension = switch (contentType) {
            case "audio/webm" -> ".webm";
            case "audio/ogg" -> ".ogg";
            case "audio/wav" -> ".wav";
            default -> ".webm";
        };

        String filename = UUID.randomUUID().toString() + extension;
        Files.copy(file.getInputStream(), uploadPath.resolve(filename), StandardCopyOption.REPLACE_EXISTING);

        return "/uploads/proctoring/audio/" + filename;
    }
}
