package com.vacode.mylab;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public final class MainActivity extends Activity {
    private static final int BACKGROUND = Color.rgb(12, 16, 25);
    private static final int FOREGROUND = Color.rgb(239, 243, 250);
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final List<WebView> popups = new ArrayList<>();
    private FrameLayout content;
    private WebView web;
    private LinearLayout errorPanel;
    private TextView errorMessage;
    private TextView loadingText;
    private ProgressBar progress;
    private boolean failed;
    private boolean loading;
    private boolean backPending;
    private String retryUrl = BuildConfig.BASE_URL;
    private final Runnable connectionTimeout = () -> {
        if (loading && web != null) {
            web.stopLoading();
            showError(R.string.connection_help);
        }
    };

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        createLayout();
        createWebView();
        if (state != null) {
            Bundle webState = state.getBundle("web");
            String savedUrl = state.getString("retryUrl");
            if (NavigationPolicy.classify(savedUrl) == NavigationPolicy.Destination.INTERNAL) retryUrl = savedUrl;
            if (webState != null && web.restoreState(webState) != null) {
                beginLoading();
            } else load(retryUrl);
        } else load(BuildConfig.BASE_URL);
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBack);
        }
    }

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private Button button(int label, Runnable action) {
        Button button = new Button(this);
        button.setText(label);
        button.setAllCaps(false);
        button.setTextColor(FOREGROUND);
        button.setMinHeight(dp(48));
        button.setOnClickListener(view -> action.run());
        return button;
    }

    private void createLayout() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(BACKGROUND);
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                Insets keyboard = insets.getInsets(WindowInsets.Type.ime());
                view.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, keyboard.bottom));
                return insets;
            });
        } else root.setFitsSystemWindows(true);
        LinearLayout toolbar = new LinearLayout(this);
        toolbar.setGravity(Gravity.CENTER_VERTICAL);
        toolbar.setPadding(dp(12), 0, dp(8), 0);
        TextView title = new TextView(this);
        title.setText(R.string.toolbar_title);
        title.setTextColor(FOREGROUND);
        title.setTextSize(18);
        toolbar.addView(title, new LinearLayout.LayoutParams(0, dp(52), 1));
        title.setGravity(Gravity.CENTER_VERTICAL);
        toolbar.addView(button(R.string.refresh, this::retry));
        root.addView(toolbar);
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setMax(100);
        root.addView(progress, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(3)));
        content = new FrameLayout(this);
        root.addView(content, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));
        loadingText = new TextView(this);
        loadingText.setText(R.string.loading);
        loadingText.setTextColor(FOREGROUND);
        loadingText.setGravity(Gravity.CENTER);
        loadingText.setBackgroundColor(BACKGROUND);
        content.addView(loadingText, new FrameLayout.LayoutParams(-1, -1));
        errorPanel = new LinearLayout(this);
        errorPanel.setOrientation(LinearLayout.VERTICAL);
        errorPanel.setGravity(Gravity.CENTER);
        errorPanel.setPadding(dp(28), dp(24), dp(28), dp(24));
        errorPanel.setBackgroundColor(BACKGROUND);
        TextView heading = new TextView(this);
        heading.setText(R.string.connection_error);
        heading.setTextColor(FOREGROUND);
        heading.setTextSize(22);
        errorPanel.addView(heading);
        errorMessage = new TextView(this);
        errorMessage.setTextColor(FOREGROUND);
        errorMessage.setTextSize(15);
        errorMessage.setGravity(Gravity.CENTER);
        errorMessage.setPadding(0, dp(18), 0, dp(18));
        errorPanel.addView(errorMessage);
        errorPanel.addView(button(R.string.retry, this::retry));
        errorPanel.addView(button(R.string.home, () -> load(BuildConfig.BASE_URL)));
        content.addView(errorPanel, new FrameLayout.LayoutParams(-1, -1));
        errorPanel.setVisibility(View.GONE);
        setContentView(root);
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void createWebView() {
        web = new WebView(this);
        web.setBackgroundColor(BACKGROUND);
        web.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_YES);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setGeolocationEnabled(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSafeBrowsingEnabled(true);
        settings.setSupportMultipleWindows(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(web, false);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                NavigationPolicy.Destination destination = NavigationPolicy.classify(request.getUrl().toString());
                if (destination == NavigationPolicy.Destination.INTERNAL) return false;
                if (request.isForMainFrame()) route(request.getUrl().toString());
                return true;
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (!"https".equalsIgnoreCase(request.getUrl().getScheme())) {
                    return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked", Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
                }
                return null;
            }
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                if (NavigationPolicy.classify(url) != NavigationPolicy.Destination.INTERNAL) {
                    view.stopLoading();
                    route(url);
                    showError(R.string.connection_help);
                    return;
                }
                retryUrl = url;
                beginLoading();
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (!failed && NavigationPolicy.classify(url) == NavigationPolicy.Destination.INTERNAL) {
                    loading = false;
                    handler.removeCallbacks(connectionTimeout);
                    progress.setVisibility(View.INVISIBLE);
                    loadingText.setVisibility(View.GONE);
                    CookieManager.getInstance().flush();
                }
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showError(R.string.connection_help);
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame() && response.getStatusCode() >= 400) showError(R.string.server_error);
            }
            @Override public void onReceivedSslError(WebView view, SslErrorHandler ssl, SslError error) {
                ssl.cancel();
                showError(R.string.certificate_error);
            }
            @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                content.removeView(view);
                view.destroy();
                web = null;
                showError(R.string.renderer_error);
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int value) {
                if (!failed && loading) progress.setProgress(value);
            }
            @Override public void onPermissionRequest(PermissionRequest request) { request.deny(); }
            @Override public boolean onCreateWindow(WebView view, boolean dialog, boolean gesture, Message message) {
                if (!gesture) return false;
                WebView popup = new WebView(MainActivity.this);
                popup.getSettings().setAllowFileAccess(false);
                popup.getSettings().setAllowContentAccess(false);
                popups.add(popup);
                Runnable cleanup = () -> { if (popups.remove(popup)) popup.destroy(); };
                popup.setWebViewClient(new WebViewClient() {
                    @Override public boolean shouldOverrideUrlLoading(WebView child, WebResourceRequest request) {
                        route(request.getUrl().toString());
                        handler.post(cleanup);
                        return true;
                    }
                    @Override public void onPageStarted(WebView child, String url, android.graphics.Bitmap icon) {
                        child.stopLoading();
                        if (!"about:blank".equals(url)) route(url);
                        handler.post(cleanup);
                    }
                });
                ((WebView.WebViewTransport) message.obj).setWebView(popup);
                message.sendToTarget();
                handler.postDelayed(cleanup, 15000);
                return true;
            }
        });
        web.setDownloadListener((url, agent, disposition, type, length) -> openExternal(url));
        content.addView(web, 0, new FrameLayout.LayoutParams(-1, -1));
    }

    private void beginLoading() {
        failed = false;
        loading = true;
        errorPanel.setVisibility(View.GONE);
        loadingText.setVisibility(View.VISIBLE);
        progress.setVisibility(View.VISIBLE);
        progress.setProgress(0);
        handler.removeCallbacks(connectionTimeout);
        handler.postDelayed(connectionTimeout, 30000);
    }
    private void showError(int message) {
        backPending = false;
        failed = true;
        loading = false;
        handler.removeCallbacks(connectionTimeout);
        progress.setVisibility(View.INVISIBLE);
        loadingText.setVisibility(View.GONE);
        errorMessage.setText(message);
        errorPanel.setVisibility(View.VISIBLE);
        errorPanel.announceForAccessibility(getString(message));
    }
    private void load(String url) {
        if (NavigationPolicy.classify(url) != NavigationPolicy.Destination.INTERNAL) return;
        if (web == null) createWebView();
        retryUrl = url;
        beginLoading();
        web.loadUrl(url);
    }
    private void retry() {
        if (web != null && !failed && NavigationPolicy.classify(web.getUrl()) == NavigationPolicy.Destination.INTERNAL) {
            beginLoading();
            web.reload();
        } else load(retryUrl);
    }
    private void route(String url) {
        NavigationPolicy.Destination destination = NavigationPolicy.classify(url);
        if (destination == NavigationPolicy.Destination.INTERNAL) load(url);
        else if (destination == NavigationPolicy.Destination.EXTERNAL) openExternal(url);
        else Toast.makeText(this, R.string.blocked_link, Toast.LENGTH_SHORT).show();
    }
    private void openExternal(String url) {
        if (NavigationPolicy.classify(url) == NavigationPolicy.Destination.BLOCKED) return;
        try {
            Uri uri = Uri.parse(url);
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            intent.addCategory(Intent.CATEGORY_BROWSABLE);
            startActivity(intent);
        } catch (ActivityNotFoundException | SecurityException exception) {
            Toast.makeText(this, R.string.external_unavailable, Toast.LENGTH_SHORT).show();
        }
    }

    // Legacy API 26-32 fallback only. API 33+ registers the native system dispatcher in onCreate.
    @SuppressLint("GestureBackNavigation")
    @SuppressWarnings("deprecation")
    @Override public void onBackPressed() { handleBack(); }
    private void handleBack() {
        if (backPending) return;
        if (web == null || failed || NavigationPolicy.classify(web.getUrl()) != NavigationPolicy.Destination.INTERNAL) {
            backOrExit();
            return;
        }
        backPending = true;
        // Only inspect our trusted page; no JavaScript bridge or native methods are exposed.
        // Cancel the top dialog first, including a detail opened from a direct hash link.
        web.evaluateJavascript("(function(){var ds=document.querySelectorAll('dialog[open]');var d=ds[ds.length-1];if(!d)return false;var e=new Event('cancel',{cancelable:true});if(d.dispatchEvent(e))d.close();return true;})()", result -> {
            backPending = false;
            if (!isFinishing() && !"true".equals(result)) backOrExit();
        });
    }
    private void backOrExit() {
        if (web != null && web.canGoBack()) {
            failed = false;
            errorPanel.setVisibility(View.GONE);
            web.goBack();
        } else {
            new AlertDialog.Builder(this).setTitle(R.string.exit_title)
                .setNegativeButton(R.string.cancel, null)
                .setPositiveButton(R.string.exit, (dialog, which) -> finish()).show();
        }
    }
    @Override protected void onSaveInstanceState(Bundle state) {
        if (web != null) {
            Bundle webState = new Bundle();
            web.saveState(webState);
            state.putBundle("web", webState);
        }
        state.putString("retryUrl", retryUrl);
        super.onSaveInstanceState(state);
    }
    @Override protected void onPause() {
        if (web != null) web.onPause();
        CookieManager.getInstance().flush();
        super.onPause();
    }
    @Override protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
    }
    @Override protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        for (WebView popup : popups) popup.destroy();
        popups.clear();
        if (web != null) {
            content.removeView(web);
            web.stopLoading();
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
