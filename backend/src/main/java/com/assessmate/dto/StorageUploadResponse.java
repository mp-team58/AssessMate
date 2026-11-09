package com.assessmate.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StorageUploadResponse {
    private String objectPath;
    private String signedUrl;
    private int expiresIn;
    private String mimeType;
    private long size;
}

