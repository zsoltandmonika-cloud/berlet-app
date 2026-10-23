package hu.zsoltmonika.sh9light;

import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
import android.graphics.Color;
import android.content.Intent;
import android.net.Uri;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceResponse;
import java.io.IOException;

public final class MainActivity extends Activity {
    private static final String HOME =
        "https://zsoltandmonika-cloud.github.io/berlet-app/sh9/?sh9native=1&v=22";
    private WebView browser;

    // The approved SH9 v22 shell is bundled inside this APK.
    // Only the Launcher is pinned. HealthHub/Guardian and external weather remain live.
    // Serving local resources at their original HTTPS URLs preserves relative navigation
    // and the same origin used by the live nameday/weather script.
    private WebResourceResponse bundledLauncher(WebResourceRequest request) {
        Uri uri = request.getUrl();
        if (!"https".equalsIgnoreCase(uri.getScheme()) ||
            !"zsoltandmonika-cloud.github.io".equalsIgnoreCase(uri.getHost())) return null;
        String path = uri.getPath();
        if (path == null) return null;
        String name = null, mime = null;
        if ("/berlet-app/sh9/".equals(path) || "/berlet-app/sh9/index.html".equals(path)) {
            name = "index.html"; mime = "text/html";
        } else if ("/berlet-app/sh9/SH9_official_v21.css".equals(path)) {
            name = "SH9_official_v21.css"; mime = "text/css";
        } else if ("/berlet-app/sh9/assets/SH9_Official_Hero_v21.webp".equals(path)) {
            name = "SH9_Official_Hero_v21.webp"; mime = "image/webp";
        } else if ("/berlet-app/sh9/assets/SH9_Official_Tiles_v21.webp".equals(path)) {
            name = "SH9_Official_Tiles_v21.webp"; mime = "image/webp";
        } else if ("/berlet-app/sh9/sh9-info-v6.js".equals(path)) {
            name = "sh9-info-v6.js"; mime = "application/javascript";
        } else if ("/berlet-app/healthhub/data/namedays.json".equals(path)) {
            name = "namedays.json"; mime = "application/json";
        }
        if (name == null) return null;
        try {
            return new WebResourceResponse(mime,
                mime.startsWith("image/") ? null : "UTF-8",
                getAssets().open("sh9/" + name));
        } catch (IOException error) {
            // Fall back to the published GitHub content if local assets are corrupt.
            return null;
        }
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams p = getWindow().getAttributes();
            p.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(p);
        }
        hideSystemBars();
        browser = new WebView(this);
        browser.setBackgroundColor(Color.rgb(5, 14, 33));
        browser.setVerticalScrollBarEnabled(false);
        browser.setHorizontalScrollBarEnabled(false);
        browser.setOverScrollMode(View.OVER_SCROLL_NEVER);
        browser.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        WebSettings settings = browser.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setTextZoom(100);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        browser.setWebChromeClient(new WebChromeClient());
        browser.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(
                    WebView view, WebResourceRequest request) {
                WebResourceResponse packaged = bundledLauncher(request);
                return packaged != null ? packaged : super.shouldInterceptRequest(view, request);
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri uri = req.getUrl();
                if ("https".equalsIgnoreCase(uri.getScheme()) &&
                    "zsoltandmonika-cloud.github.io".equalsIgnoreCase(uri.getHost()) &&
                    uri.getPath() != null && uri.getPath().startsWith("/berlet-app/")) {
                    return false;
                }
                // Explicit external destinations open in the system browser, not in SH9's private shell.
                if ("https".equalsIgnoreCase(uri.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) {}
                }
                return true;
            }
        });
        setContentView(browser);
        browser.loadUrl(HOME);
    }

    @SuppressWarnings("deprecation")
    private void hideSystemBars() {
        Window window = getWindow();
        window.setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
                        WindowManager.LayoutParams.FLAG_FULLSCREEN);
        int flags = View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
                    View.SYSTEM_UI_FLAG_FULLSCREEN |
                    View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
                    View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                    View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE;
        window.getDecorView().setSystemUiVisibility(flags);
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController controller = window.getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        }
    }

    @Override public void onWindowFocusChanged(boolean focused) {
        super.onWindowFocusChanged(focused);
        if (focused) hideSystemBars();
    }

    @Override public void onBackPressed() {
        if (browser != null && browser.canGoBack()) browser.goBack();
        else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        if (browser != null) {
            browser.stopLoading();
            browser.destroy();
            browser = null;
        }
        super.onDestroy();
    }
}