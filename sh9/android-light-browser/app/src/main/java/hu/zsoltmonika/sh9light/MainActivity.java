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

public final class MainActivity extends Activity {
    private static final String HOME =
        "https://zsoltandmonika-cloud.github.io/berlet-app/sh9/?sh9native=1&v=18";
    private WebView browser;

    private static final String LAYOUT_SCRIPT =
        "(function(){" +
        "if(document.getElementById('sh9-native-fit'))return;" +
        "var css=document.createElement('style');css.id='sh9-native-fit';" +
        "css.textContent='" +
          "html,body{overflow-x:hidden!important;overflow-y:auto!important;height:auto!important;min-height:100%!important;}" +
          "body{background:#061327!important;}" +
          ".wrap{box-sizing:border-box!important;width:min(100%,420px)!important;max-width:420px!important;" +
          "height:auto!important;max-height:none!important;min-height:100dvh!important;overflow:visible!important;" +
          "display:flex!important;flex-direction:column!important;margin:0 auto!important;" +
          "padding:6px 7px calc(72px + env(safe-area-inset-bottom,0px))!important;}" +
          ".hero.sh9-final-ready{width:100%!important;min-height:0!important;height:auto!important;" +
          "aspect-ratio:1380 / 1001!important;flex:0 0 auto!important;" +
          "margin:0 0 7px!important;overflow:hidden!important;}" +
          ".hero.sh9-final-ready img{width:100%!important;height:100%!important;object-fit:contain!important;}" +
          ".sh9-info{flex:0 0 auto!important;height:58px!important;min-height:58px!important;" +
          "margin:0!important;}" +
          ".grid{flex:0 0 auto!important;width:var(--sh9-native-grid,96%)!important;" +
          "max-width:none!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;" +
          "gap:6px!important;margin:7px auto 0!important;align-content:start!important;}" +
          ".grid>.tile{aspect-ratio:1/1!important;min-height:0!important;width:100%!important;}" +
          ".nav{position:fixed!important;left:50%!important;transform:translateX(-50%)!important;" +
          "bottom:0!important;max-width:420px!important;width:100%!important;" +
          "min-height:58px!important;z-index:40!important;}" +
          "@media(orientation:landscape){.wrap{min-height:100dvh!important;}}';" +
        "document.head.appendChild(css);" +
        "var wrap=document.querySelector('.wrap'),hero=document.querySelector('.hero')," +
        "info=document.getElementById('sh9InfoBar6'),grid=document.querySelector('.grid'),nav=document.querySelector('.nav');" +
        "if(!wrap||!hero||!info||!grid||!nav)return;" +
        "function fit(){" +
        "var vh=window.visualViewport?window.visualViewport.height:window.innerHeight;" +
        "var sw=getComputedStyle(wrap);var maxW=wrap.clientWidth-(parseFloat(sw.paddingLeft)||7)-(parseFloat(sw.paddingRight)||7);" +
        "var h=hero.getBoundingClientRect().height||maxW*1001/1380;" +
        "var inf=info.getBoundingClientRect().height||58;var n=nav.getBoundingClientRect().height||62;" +
        "var room=Math.floor(vh-(parseFloat(sw.paddingTop)||6)-h-7-inf-7-n-12);" +
        "var width=Math.floor(Math.min(maxW*.96,390,room));" +
        "if(width<282){width=Math.floor(Math.min(maxW*.96,390));}" +
        "grid.style.setProperty('--sh9-native-grid',width+'px');" +
        "}" +
        "fit();window.addEventListener('resize',fit,{passive:true});" +
        "if(window.visualViewport)window.visualViewport.addEventListener('resize',fit,{passive:true});" +
        "var img=hero.querySelector('img');if(img)img.addEventListener('load',fit,{passive:true});" +
        "window.scrollTo(0,0);" +
        "})();";

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
            @Override public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (url.startsWith("https://zsoltandmonika-cloud.github.io/berlet-app/sh9/")) {
                    view.evaluateJavascript(LAYOUT_SCRIPT, null);
                }
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