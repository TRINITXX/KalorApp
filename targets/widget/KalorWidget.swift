import WidgetKit
import SwiftUI

struct KalorWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> KalorEntry {
        KalorEntry(date: Date(), summary: .empty)
    }

    func getSnapshot(in context: Context, completion: @escaping (KalorEntry) -> Void) {
        completion(KalorEntry(date: Date(), summary: DailySummary.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<KalorEntry>) -> Void) {
        let entry = KalorEntry(date: Date(), summary: DailySummary.load())
        let timeline = Timeline(entries: [entry], policy: .atEnd)
        completion(timeline)
    }
}

struct KalorEntry: TimelineEntry {
    let date: Date
    let summary: DailySummary
}

struct KalorWidgetEntryView: View {
    var entry: KalorEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(summary: entry.summary)
        case .systemMedium:
            MediumWidgetView(summary: entry.summary)
        default:
            SmallWidgetView(summary: entry.summary)
        }
    }
}

@main
struct KalorWidget: Widget {
    let kind = "KalorWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: KalorWidgetProvider()) { entry in
            if #available(iOS 17.0, *) {
                KalorWidgetEntryView(entry: entry)
                    .containerBackground(.fill.tertiary, for: .widget)
            } else {
                KalorWidgetEntryView(entry: entry)
                    .padding()
            }
        }
        .configurationDisplayName("KalorApp")
        .description("Suivi calorique du jour")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
