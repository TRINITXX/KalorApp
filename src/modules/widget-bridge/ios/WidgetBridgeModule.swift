import ExpoModulesCore
import WidgetKit

private let appGroupId = "group.com.kalorapp.app"

public class WidgetBridgeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WidgetBridge")

    Function("getSharedContainerPath") { () -> String? in
      return FileManager.default
        .containerURL(forSecurityApplicationGroupIdentifier: appGroupId)?
        .appendingPathComponent("kalor.db")
        .path
    }

    Function("setWidgetData") { (jsonString: String) in
      guard let defaults = UserDefaults(suiteName: appGroupId) else { return }
      defaults.set(jsonString, forKey: "dailySummary")
    }

    Function("reloadWidgets") {
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }
    }
  }
}
