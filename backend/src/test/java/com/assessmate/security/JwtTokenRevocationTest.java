package com.assessmate.security;

import com.assessmate.entity.Role;
import com.assessmate.entity.User;
import com.assessmate.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class JwtTokenRevocationTest {

    private JwtUtil jwtUtil;
    private UserRepository userRepository;
    private UserDetailsService userDetailsService;
    private JwtFilter jwtFilter;

    private final String secret = "assessmateSuperSecretJwtKeyForUnitTestingPurposesOnly1234567890";
    private final Long expiration = 3600000L; // 1 hour

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secret", secret);
        ReflectionTestUtils.setField(jwtUtil, "expiration", expiration);

        userRepository = mock(UserRepository.class);
        userDetailsService = mock(UserDetailsService.class);
        jwtFilter = new JwtFilter(jwtUtil, userDetailsService, userRepository);
    }

    @Test
    @DisplayName("1. Newly generated JWT with current tokenVersion is accepted")
    void testNewJwtWithMatchingVersionAccepted() throws Exception {
        String email = "host@assessmate.com";
        Long version = 1L;
        String token = jwtUtil.generateToken(email, "HOST", version);

        User user = User.builder()
                .id(1L)
                .email(email)
                .name("Host User")
                .role(Role.HOST)
                .tokenVersion(version)
                .activeToken(token)
                .build();

        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));
        UserDetails userDetails = org.springframework.security.core.userdetails.User
                .withUsername(email)
                .password("password")
                .roles("HOST")
                .build();
        when(userDetailsService.loadUserByUsername(email)).thenReturn(userDetails);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = mock(FilterChain.class);

        jwtFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertEquals(HttpServletResponse.SC_OK, response.getStatus());
    }

    @Test
    @DisplayName("2. Token with revoked/stale tokenVersion is rejected with HTTP 401")
    void testRevokedTokenVersionRejected() throws Exception {
        String email = "candidate@assessmate.com";
        // Token was generated with version 1
        String token = jwtUtil.generateToken(email, "CANDIDATE", 1L);

        // User logged out or reset password -> tokenVersion incremented to 2
        User user = User.builder()
                .id(2L)
                .email(email)
                .name("Candidate User")
                .role(Role.CANDIDATE)
                .tokenVersion(2L)
                .activeToken(null)
                .build();

        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = mock(FilterChain.class);

        jwtFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain, never()).doFilter(request, response);
        assertEquals(HttpServletResponse.SC_UNAUTHORIZED, response.getStatus());
        assertTrue(response.getContentAsString().contains("Token has been revoked"));
    }

    @Test
    @DisplayName("3. Expired JWT is rejected with HTTP 401")
    void testExpiredJwtRejected() throws Exception {
        // Create an expired token by setting expiration to -1000ms
        JwtUtil expiredJwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(expiredJwtUtil, "secret", secret);
        ReflectionTestUtils.setField(expiredJwtUtil, "expiration", -1000L);

        String expiredToken = expiredJwtUtil.generateToken("user@assessmate.com", "HOST", 1L);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + expiredToken);
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = mock(FilterChain.class);

        jwtFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain, never()).doFilter(request, response);
        assertEquals(HttpServletResponse.SC_UNAUTHORIZED, response.getStatus());
        assertTrue(response.getContentAsString().contains("Invalid or expired token"));
    }

    @Test
    @DisplayName("4. Malformed JWT is rejected with HTTP 401")
    void testMalformedJwtRejected() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer thisIsNotAValidJwtToken");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = mock(FilterChain.class);

        jwtFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain, never()).doFilter(request, response);
        assertEquals(HttpServletResponse.SC_UNAUTHORIZED, response.getStatus());
        assertTrue(response.getContentAsString().contains("Invalid or expired token"));
    }

    @Test
    @DisplayName("5. New login after revocation issues token with new version that is accepted")
    void testNewLoginAfterRevocationWorks() throws Exception {
        String email = "candidate@assessmate.com";
        Long newVersion = 3L;
        String newToken = jwtUtil.generateToken(email, "CANDIDATE", newVersion);

        User user = User.builder()
                .id(3L)
                .email(email)
                .name("Candidate User")
                .role(Role.CANDIDATE)
                .tokenVersion(newVersion)
                .activeToken(newToken)
                .build();

        when(userRepository.findByEmail(email)).thenReturn(Optional.of(user));
        UserDetails userDetails = org.springframework.security.core.userdetails.User
                .withUsername(email)
                .password("password")
                .roles("CANDIDATE")
                .build();
        when(userDetailsService.loadUserByUsername(email)).thenReturn(userDetails);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + newToken);
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain filterChain = mock(FilterChain.class);

        jwtFilter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertEquals(HttpServletResponse.SC_OK, response.getStatus());
    }
}
