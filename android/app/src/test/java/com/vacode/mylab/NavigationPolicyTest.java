package com.vacode.mylab;

import org.junit.Test;
import static org.junit.Assert.assertEquals;

public class NavigationPolicyTest {
    @Test public void acceptsOnlyExactHttpsOrigin() {
        assertEquals(NavigationPolicy.Destination.INTERNAL, NavigationPolicy.classify(BuildConfig.BASE_URL));
        assertEquals(NavigationPolicy.Destination.INTERNAL, NavigationPolicy.classify(BuildConfig.BASE_URL + "#issue=ogw07222-tech/mylab/3"));
        assertEquals(NavigationPolicy.Destination.INTERNAL, NavigationPolicy.classify(BuildConfig.BASE_URL.replace(".app/", ".app:443/") + "?a=1"));
    }
    @Test public void externalLinksStayOutsideWebView() {
        for (String url : new String[]{"https://github.com/ogw07222-tech/mylab", "mailto:owner@example.com", "tel:+821012345678", BuildConfig.BASE_URL.replace("https:", "http:"), BuildConfig.BASE_URL.replace(".app/", ".app:444/"), BuildConfig.BASE_URL.replace(".app/", ".app.evil.example/")}) {
            assertEquals(url, NavigationPolicy.Destination.EXTERNAL, NavigationPolicy.classify(url));
        }
    }
    @Test public void rejectsSchemesCredentialsAndMalformedUrls() {
        for (String url : new String[]{"javascript:alert(1)", "file:///etc/passwd", "content://secret", "intent://test", "data:text/html,test", "https://mylab-ogw2.vercel.app@evil.example", "//evil.example", "not a URL", "https:evil.example", "https:///", ""}) {
            assertEquals(url, NavigationPolicy.Destination.BLOCKED, NavigationPolicy.classify(url));
        }
        assertEquals(NavigationPolicy.Destination.BLOCKED, NavigationPolicy.classify(null));
    }
}
