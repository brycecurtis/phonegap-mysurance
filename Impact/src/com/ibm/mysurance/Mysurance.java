package com.ibm.mysurance;

import com.phonegap.DroidGap;

import android.os.Bundle;

public class Mysurance extends DroidGap {
    /** Called when the activity is first created. */
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        super.loadUrl("file:///android_asset/www/apps/mysurance/step10.html");
    }
}