# Zingo: Eine Zcash-Anwendung

Nutze Kryptographie mit Zero-Knowledge-Beweisen, um Transaktionen durchzuführen und deinen Transaktionsverlauf auf private und achtsame Weise zu verwalten.

Übernehme die exklusive und einzigartige Kontrolle über deine Finanzhistorie. Nutze diese einzigartigen Einblicke in dein eigenes Finanzverhalten, um zu reflektieren, wie du Geld ausgibst. Teile Erkenntnisse nach deinen eigenen Bedingungen. Baue gesunde Beziehungen zu verschiedenen Wirtschaftsgemeinschaften auf.

Nur du hast die Macht, deine Informationen zu teilen! Deine Perspektive zählt. Du zählst.

Memos und Transaktionen
Wenn du Zcash sendest, kannst du ein Memo schreiben, das alles enthält, was du möchtest. Wenn du Zcash erhältst, erhältst du auch das Memo, das der Absender geschrieben hat. Wie bei den meisten Kryptowährungen senden Wallets routinemäßig Transaktionen an sich selbst, um "Wechselgeld" aus der Transaktion zurückzuerhalten. In diesem Fall, in dem die Anwendung sowohl Absender als auch Empfänger ist, verwendet Zingo das Memo-System, um sich selbst Notizen über die Transaktionen zu machen, die sie für den Benutzer erstellt.

Zingo extrahiert diese Daten, um dir exklusive Einblicke zu bieten. In unserer ersten Version verwenden wir diesen introspektiven Mechanismus bereits, um uns zu "merken", an welche vollständigen Unified Addresses du zuvor Zcash gesendet hast. Mit anderen Worten, Zingo verfolgt, an wen du Zcash gesendet hast, auf der Blockchain. Dieses "Adressbuch" von Personen, an die du in der Vergangenheit "gesendet" hast, ist völlig privat und wird, solange du deine Seed-Phrase ordnungsgemäß schützt, vollständig wiederhergestellt, selbst wenn du dein Gerät verlierst.

Wir implementieren derzeit eine weitere Verwendung dieser On-Chain-Memos, die es dir ermöglicht, (auch wenn du dein Gerät verlierst) zu verfolgen, welche Adressen du zuvor erstellt hast, um Gelder zu empfangen. Das heißt, du hast immer eine vollständige Liste aller Adressen, die du Personen gebeten hast, zu verwenden, um dir Zcash zu senden.

Zusammengenommen bieten dir diese beiden introspektiven Mechanismen Einblicke darüber, an wen du Gelder gesendet und von wem du Gelder angefordert hast. Dies ist erst der Anfang! Wir beabsichtigen, Mechanismen zu implementieren, die es Benutzern ermöglichen, ihre Erkenntnisse auf anonyme und wirtschaftlich tragfähige Weise zu teilen, wodurch sich Gemeinschaften um Marktplätze mit interessanten Erkenntnissen bilden können!

Datenschutz und Community
Deine On-Chain-Transaktionsdetails werden niemals Dritten zugänglich gemacht. Indem wir dir private Einblicke in dein eigenes wirtschaftliches Verhalten geben, ermöglichen wir es jedem, gesündere finanzielle Entscheidungen zu treffen. Wir erwarten vielfältige Gemeinschaften, die sich um verschiedene Arten von Erkenntnissen bilden, um auf gemeinsamen Werten zusammenzuarbeiten.

Technisches Detail des UA-Caching:
Zcash unterstützt eine Unified Address mit mehreren Protokollen, die es dem Protokoll ermöglicht, auf neuere Versionen zu aktualisieren, ohne die Abwärtskompatibilität mit früheren Versionen zu beeinträchtigen. Dieses Unified Address-System wird von Clients außerhalb der Chain implementiert. Clients teilen Unified Addresses miteinander. Die Unified Addresses enthalten protokollspezifische Adressen, die der Client auspacken und als Teil der von ihm erstellten Transaktion in der Blockchain veröffentlichen kann. Dies bedeutet, dass die On-Chain-Adresse, die mit einer Transaktion verknüpft ist, nicht alle Informationen enthält, die der sendende Client als "Unified Address" vom empfangenden Client außerhalb der Chain erhalten hat. Wenn der sendende Client die UA einfach außerhalb der Chain aufzeichnen würde, gäbe es im Falle eines Re-Sprouting des Clients aus seiner Seed-Phrase keine Möglichkeit, diese Beziehungsdaten wiederherzustellen. Zingo löst dieses Problem, indem es die vom ursprünglichen Empfänger bereitgestellte UA im Memo-Feld des Wechselgelds aus der Transaktion aufzeichnet.