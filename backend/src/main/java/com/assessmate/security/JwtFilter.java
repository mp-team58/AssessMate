package com.assessmate.security;

import com.assessmate.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication
        .UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context
        .SecurityContextHolder;
import org.springframework.security.core.userdetails
        .UserDetails;
import org.springframework.security.core.userdetails
        .UserDetailsService;
import org.springframework.security.web.authentication
        .WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader =
                request.getHeader("Authorization");

        if (authHeader == null
                || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);

        // Step 1 — validate token signature
        if (!jwtUtil.validateToken(token)) {
            filterChain.doFilter(request, response);
            return;
        }

        String email = jwtUtil.extractEmail(token);

        if (email == null) {
            filterChain.doFilter(request, response);
            return;
        }

        // Step 2 — check token matches database
        // This is what enforces single device login
        boolean tokenMatchesDatabase =
                userRepository
                        .findByEmail(email)
                        .map(user ->
                                token.equals(user.getActiveToken()))
                        .orElse(false);

        if (!tokenMatchesDatabase) {
            // Token is valid JWT but not the
            // current active token
            // User has logged in from another device
            response.setStatus(
                    HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(
                    "application/json");
            response.getWriter().write(
                    "{\"message\": \"Session expired. " +
                            "Your account was logged in from " +
                            "another device. Please login again.\"}");
            return;
        }

        // Step 3 — set authentication in context
        if (SecurityContextHolder.getContext()
                .getAuthentication() == null) {

            UserDetails userDetails =
                    userDetailsService
                            .loadUserByUsername(email);

            UsernamePasswordAuthenticationToken
                    authToken =
                    new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities());

            authToken.setDetails(
                    new WebAuthenticationDetailsSource()
                            .buildDetails(request));

            SecurityContextHolder.getContext()
                    .setAuthentication(authToken);
        }

        filterChain.doFilter(request, response);
    }
}