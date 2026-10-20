package com.vacode.mylab;

import java.net.URI;

/** Exact-origin navigation policy, shared by main-frame, popup and download routing. */
final class NavigationPolicy {
    enum Destination { INTERNAL, EXTERNAL, BLOCKED }
    static Destination classify(String raw) {
        if (raw == null || raw.trim().isEmpty()) return Destination.BLOCKED;
        try {
            URI uri = new URI(raw);
            String scheme = uri.getScheme();
            if (scheme == null || uri.getRawUserInfo() != null) return Destination.BLOCKED;
            if ("https".equalsIgnoreCase(scheme)) {
                if (uri.getHost() == null) return Destination.BLOCKED;
                URI base = new URI(BuildConfig.BASE_URL);
                if (base.getHost().equalsIgnoreCase(uri.getHost()) && (uri.getPort() == -1 || uri.getPort() == 443)) {
                    return Destination.INTERNAL;
                }
                return Destination.EXTERNAL;
            }
            if ("http".equalsIgnoreCase(scheme) && uri.getHost() != null) return Destination.EXTERNAL;
            if (("mailto".equalsIgnoreCase(scheme) || "tel".equalsIgnoreCase(scheme)) && !uri.getSchemeSpecificPart().trim().isEmpty()) {
                return Destination.EXTERNAL;
            }
        } catch (Exception ignored) { /* Malformed and opaque web URLs stay blocked. */ }
        return Destination.BLOCKED;
    }
}
