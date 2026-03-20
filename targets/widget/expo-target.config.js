/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  name: "KalorWidget",
  deploymentTarget: "16.0",
  frameworks: ["WidgetKit", "SwiftUI", "AppIntents"],
  entitlements: {
    "com.apple.security.application-groups":
      config.ios.entitlements["com.apple.security.application-groups"],
  },
});
