package com.assessmate.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.web.util.matcher.IpAddressMatcher;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Resolves client IP address from HTTP requests.
 * Only trusts X-Forwarded-For and X-Real-IP headers when request arrives from a trusted proxy.
 * Supports exact IPv4, IPv4 CIDR ranges (e.g. 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16),
 * exact IPv6 (e.g. ::1, 0:0:0:0:0:0:0:1), and IPv6 CIDR ranges.
 */
@Component
public class ClientIpResolver {

    private final List<IpAddressMatcher> matchers = new ArrayList<>();
    private final boolean trustAll;

    public ClientIpResolver(
            @Value("${app.security.trusted-proxies:127.0.0.1,0:0:0:0:0:0:0:1,::1}") String trustedProxiesConfig
    ) {
        boolean wildcard = false;
        if (trustedProxiesConfig != null && !trustedProxiesConfig.trim().isEmpty()) {
            for (String entry : trustedProxiesConfig.split(",")) {
                String trimmed = entry.trim();
                if ("*".equals(trimmed)) {
                    wildcard = true;
                } else if (!trimmed.isEmpty()) {
                    try {
                        matchers.add(new IpAddressMatcher(trimmed));
                    } catch (Exception ignored) {
                    }
                }
            }
        } else {
            matchers.add(new IpAddressMatcher("127.0.0.1"));
            matchers.add(new IpAddressMatcher("::1"));
        }
        this.trustAll = wildcard;
    }

    public String resolveClientIp(HttpServletRequest request) {
        if (request == null) {
            return "unknown";
        }

        String remoteAddr = request.getRemoteAddr();
        if (remoteAddr == null || remoteAddr.trim().isEmpty()) {
            return "unknown";
        }

        if (isTrustedProxy(remoteAddr)) {
            String xForwardedFor = request.getHeader("X-Forwarded-For");
            if (xForwardedFor != null && !xForwardedFor.trim().isEmpty() && !"unknown".equalsIgnoreCase(xForwardedFor)) {
                return xForwardedFor.split(",")[0].trim();
            }

            String xRealIp = request.getHeader("X-Real-IP");
            if (xRealIp != null && !xRealIp.trim().isEmpty() && !"unknown".equalsIgnoreCase(xRealIp)) {
                return xRealIp.trim();
            }
        }

        return remoteAddr;
    }

    public boolean isTrustedProxy(String ip) {
        if (ip == null || ip.trim().isEmpty()) return false;
        if (trustAll) return true;

        String trimmed = ip.trim();
        for (IpAddressMatcher matcher : matchers) {
            try {
                if (matcher.matches(trimmed)) {
                    return true;
                }
            } catch (Exception ignored) {
            }
        }
        return false;
    }
}
