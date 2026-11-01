package com.assessmate.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Date;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private Long expiration;

    // Generate JWT Token with tokenVersion claim
    public String generateToken(String email, String role, Long tokenVersion) {
        return Jwts.builder()
                .setSubject(email)
                .claim("role", role)
                .claim("tokenVersion", tokenVersion != null ? tokenVersion : 1L)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(Keys.hmacShaKeyFor(secret.getBytes()))
                .compact();
    }

    // Overload for backward compatibility
        // Generate short-lived, file-scoped media token (e.g. 120s expiration)
    public String generateMediaToken(String email, String filename, long durationSeconds) {
        return Jwts.builder()
                .setSubject(email)
                .claim("scope", "media_access")
                .claim("file", filename)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + (durationSeconds * 1000)))
                .signWith(io.jsonwebtoken.security.Keys.hmacShaKeyFor(secret.getBytes()))
                .compact();
    }

    public String generateToken(String email, String role) {
        return generateToken(email, role, 1L);
    }

    // Extract Email from JWT Token
    public String extractEmail(String token) {
        return extractAllClaims(token).getSubject();
    }

    public String extractEmailSafely(String token) {
        try {
            Claims claims = extractAllClaimsSafely(token);
            return claims != null ? claims.getSubject() : null;
        } catch (Exception e) {
            return null;
        }
    }

    public Long extractTokenVersion(String token) {
        Claims claims = extractAllClaimsSafely(token);
        if (claims == null) {
            return null;
        }
        Object tv = claims.get("tokenVersion");
        if (tv instanceof Number) {
            return ((Number) tv).longValue();
        }
        return null;
    }

    public Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(Keys.hmacShaKeyFor(secret.getBytes()))
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public Claims extractAllClaimsSafely(String token) {
        try {
            return Jwts.parserBuilder()
                    .setSigningKey(Keys.hmacShaKeyFor(secret.getBytes()))
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
        } catch (Exception e) {
            return null;
        }
    }

    // Validate JWT Token signature and expiration
    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(Keys.hmacShaKeyFor(secret.getBytes()))
                    .build()
                    .parseClaimsJws(token);

            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
