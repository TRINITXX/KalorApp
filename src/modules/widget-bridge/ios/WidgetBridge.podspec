# Without this file autolinking skips the module on iOS: up to build 1.1.0 the
# app shipped without it, so the widget and Siri never got the app's data.
Pod::Spec.new do |s|
  s.name           = 'WidgetBridge'
  s.version        = '1.0.0'
  s.summary        = 'Shares KalorApp data with the widget and Siri extension'
  s.description    = 'App Group container path and shared UserDefaults for the KalorWidget extension'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '15.1'
  }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES'
  }
end
