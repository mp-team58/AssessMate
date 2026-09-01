package com.assessmate.controller;

import com.assessmate.dto.ExcelUploadResponse;
import com.assessmate.service.ExcelService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.security.Principal;

@RestController
@RequestMapping("/api/questions/excel")
@RequiredArgsConstructor
public class ExcelController {

    private final ExcelService excelService;

    // Download blank template
    @GetMapping("/template")
    public ResponseEntity<byte[]> downloadTemplate()
            throws IOException {

        byte[] template =
                excelService.generateTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(
                MediaType.APPLICATION_OCTET_STREAM);
        headers.setContentDispositionFormData(
                "attachment",
                "assessmate_question_template.xlsx");

        return ResponseEntity.ok()
                .headers(headers)
                .body(template);
    }

    // Upload filled Excel
    @PostMapping(
            value = "/upload/{examId}",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ExcelUploadResponse>
    uploadExcel(
            @PathVariable Long examId,
            @RequestParam("file")
            MultipartFile file,
            Principal principal)
            throws IOException {

        return ResponseEntity.ok(
                excelService.processExcel(
                        examId,
                        file,
                        principal.getName()));
    }
}