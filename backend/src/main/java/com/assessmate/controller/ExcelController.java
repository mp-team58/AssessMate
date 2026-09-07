package com.assessmate.controller;

import com.assessmate.service.ExcelService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.io.IOException;

@RestController
@RequestMapping("/api/questions/excel")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class ExcelController {

    private final ExcelService excelService;

    // Download blank Excel question template (Publicly accessible)
    @GetMapping("/template")
    public ResponseEntity<byte[]> downloadTemplate() throws IOException {
        byte[] template = excelService.generateTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        headers.setContentDispositionFormData(
                "attachment",
                "assessmate_question_template.xlsx");

        return ResponseEntity.ok()
                .headers(headers)
                .body(template);
    }
}