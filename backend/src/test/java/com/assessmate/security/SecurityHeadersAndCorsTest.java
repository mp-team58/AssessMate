package com.assessmate.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class SecurityHeadersAndCorsTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("1. X-Frame-Options is DENY")
    void testXFrameOptionsIsDeny() throws Exception {
        mockMvc.perform(get("/api/coding/languages"))
                .andExpect(header().string("X-Frame-Options", "DENY"));
    }

    @Test
    @DisplayName("2. X-Content-Type-Options is nosniff")
    void testXContentTypeOptionsIsNosniff() throws Exception {
        mockMvc.perform(get("/api/coding/languages"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"));
    }

    @Test
    @DisplayName("3. Referrer-Policy is strict-origin-when-cross-origin")
    void testReferrerPolicy() throws Exception {
        mockMvc.perform(get("/api/coding/languages"))
                .andExpect(header().string("Referrer-Policy", "strict-origin-when-cross-origin"));
    }

    @Test
    @DisplayName("4. Content-Security-Policy contains frame-ancestors 'none'")
    void testContentSecurityPolicy() throws Exception {
        mockMvc.perform(get("/api/coding/languages"))
                .andExpect(header().string("Content-Security-Policy", containsString("frame-ancestors 'none'")));
    }

    @Test
    @DisplayName("5. Permissions-Policy includes camera, microphone, and display-capture for proctoring")
    void testPermissionsPolicy() throws Exception {
        mockMvc.perform(get("/api/coding/languages"))
                .andExpect(header().string("Permissions-Policy", containsString("camera=")))
                .andExpect(header().string("Permissions-Policy", containsString("microphone=")))
                .andExpect(header().string("Permissions-Policy", containsString("display-capture=")));
    }

    @Test
    @DisplayName("6. HSTS is absent on plain HTTP local requests")
    void testHstsAbsentOnPlainHttp() throws Exception {
        mockMvc.perform(get("/api/coding/languages"))
                .andExpect(header().doesNotExist("Strict-Transport-Security"));
    }

    @Test
    @DisplayName("7. HSTS is present on secure HTTPS requests")
    void testHstsPresentOnHttps() throws Exception {
        mockMvc.perform(get("/api/coding/languages")
                .secure(true))
                .andExpect(header().string("Strict-Transport-Security", containsString("max-age=31536000")));
    }

    @Test
    @DisplayName("8. Trusted CORS origin receives Access-Control-Allow-Origin and credentials true")
    void testTrustedCorsOriginAllowed() throws Exception {
        mockMvc.perform(options("/api/coding/languages")
                .header(HttpHeaders.ORIGIN, "http://localhost:5173")
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5173"))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS, containsString("Retry-After")));
    }

    @Test
    @DisplayName("9. Untrusted CORS origin is rejected without Access-Control-Allow-Origin")
    void testUntrustedCorsOriginRejected() throws Exception {
        mockMvc.perform(options("/api/coding/languages")
                .header(HttpHeaders.ORIGIN, "http://malicious-attacker-website.com")
                .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET"))
                .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
    }
}
