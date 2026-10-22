import AppIntents

/// Shortcuts action "Noter un repas" (KalorApp): Claude sorts what was said
/// and KalorApp's journal gets it, without opening the app. Pair it in a
/// shortcut with "Dicter le texte", then run it with Siri or Back Tap.
struct DictateMealIntent: AppIntent {
    static var title: LocalizedStringResource = "Noter un repas"
    static var description: IntentDescription = "Envoie ce que tu as mangé à Claude, qui l'ajoute au journal de KalorApp."
    static var openAppWhenRun = false

    @Parameter(title: "Ce que tu as mangé", requestValueDialog: "Qu'as-tu mangé ?")
    var text: String

    func perform() async throws -> some IntentResult & ProvidesDialog {
        do {
            let outcome = try await VoiceLogger.log(transcript: text)
            return .result(dialog: "\(outcome.sentence)")
        } catch let failure as VoiceLogger.Failure {
            return .result(dialog: "\(failure.message)")
        }
    }
}
