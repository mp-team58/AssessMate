package com.assessmate.security;

import com.assessmate.entity.AccountStatus;
import com.assessmate.entity.Role;
import com.assessmate.entity.User;
import com.assessmate.repository.UserRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String authHeader = request.getHeader("Authorization");
            String token = null;
            boolean isQueryParamToken = false;

            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7);
            } else {
                String uri = request.getRequestURI();
                if (uri != null && (uri.contains("/proctoring/") || uri.contains("/evidence/"))) {
                    String paramToken = request.getParameter("mediaToken");
                    if (paramToken == null) {
                        paramToken = request.getParameter("token");
                    }
                    if (paramToken != null && !paramToken.trim().isEmpty()) {
                        token = paramToken.trim();
                        isQueryParamToken = true;
                    }
                }
            }

            if (token == null || token.trim().isEmpty()) {
                filterChain.doFilter(request, response);
                return;
            }

            // 1. Safely extract and validate JWT signature and expiration
            Claims claims = jwtUtil.extractAllClaimsSafely(token);
            if (claims == null) {
                sendUnauthorized(response, "Invalid or expired token.");
                return;
            }

            String email = claims.getSubject();
            if (email == null) {
                sendUnauthorized(response, "Invalid token payload.");
                return;
            }

            // Query parameter security: Disallow full session JWTs in query parameters
            // Only short-lived file-scoped media tokens are permitted via query parameters
            if (isQueryParamToken) {
                Object scopeObj = claims.get("scope");
                if (!"media_access".equals(scopeObj)) {
                    sendUnauthorized(response, "Full session tokens are not permitted in query parameters. Use Authorization header.");
                    return;
                }
                String scopedFile = (String) claims.get("file");
                String uri = request.getRequestURI();
                if (scopedFile == null || !uri.endsWith(scopedFile)) {
                    sendUnauthorized(response, "Media token is not valid for this file.");
                    return;
                }
            }

            // 2. Fetch user to verify account existence and status
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isEmpty()) {
                sendUnauthorized(response, "User not found.");
                return;
            }

            User user = userOpt.get();

            // Check account status
            if (user.getStatus() == AccountStatus.DEACTIVATED) {
                sendUnauthorized(response, "Your account has been deactivated. Please contact support.");
                return;
            }
            if (user.getStatus() == AccountStatus.DELETED) {
                sendUnauthorized(response, "User not found.");
                return;
            }

            Long expectedVersion = user.getTokenVersion() != null ? user.getTokenVersion() : 1L;

            // 3. Extract tokenVersion claim from JWT
            Long tokenVersion = null;
            Object tvObj = claims.get("tokenVersion");
            if (tvObj instanceof Number) {
                tokenVersion = ((Number) tvObj).longValue();
            }

            // 4. Validate token version: reject if tokenVersion does not match current user version
            if (tokenVersion == null || !tokenVersion.equals(expectedVersion)) {
                sendUnauthorized(response, "Token has been revoked. Please log in again.");
                return;
            }

            // 5. Active token check: if activeToken is set, token must match
            if (user.getActiveToken() != null && !token.equals(user.getActiveToken())) {
                sendUnauthorized(response, "Session expired. Please log in again.");
                return;
            }

            // 6. Admin mustChangePassword enforcement: lock down everything except password change and profile
            if (user.getRole() == Role.ADMIN && Boolean.TRUE.equals(user.getMustChangePassword())) {
                String uri = request.getRequestURI();
                boolean isPasswordChangeEndpoint = uri != null && (
                        uri.endsWith("/auth/change-password") ||
                        uri.endsWith("/auth/profile") ||
                        uri.endsWith("/auth/me") ||
                        uri.endsWith("/auth/logout")
                );
                if (!isPasswordChangeEndpoint) {
                    sendForbidden(response, "Password change required. You must change your temporary password before accessing administrative features.");
                    return;
                }
            }

            // 7. Set Authentication in SecurityContext
            if (SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = userDetailsService.loadUserByUsername(email);
                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }

        } catch (Exception e) {
            log.debug("JWT filter processing error: {}", e.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    private void sendUnauthorized(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(String.format(
            "{\"status\": 401, \"error\": \"Unauthorized\", \"message\": \"%s\"}",
            message
        ));
    }

    private void sendForbidden(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(String.format(
            "{\"status\": 403, \"error\": \"Forbidden\", \"message\": \"%s\"}",
            message
        ));
    }
}
