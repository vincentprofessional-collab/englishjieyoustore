import AppKit
import PDFKit
import Vision

// Local OCR supplies page/answer locators; original PDF pages remain the authority.
let args = CommandLine.arguments
guard args.count >= 3, let pdf = PDFDocument(url: URL(fileURLWithPath: args[1])) else { exit(2) }
let output = URL(fileURLWithPath: args[2])
let barcodeOnly = args.count > 3 && args[3] == "--barcodes"
let selected = args.count > 3 && !barcodeOnly ? Set(args[3].split(separator: ",").compactMap { Int($0) }) : Set(1...pdf.pageCount)
var result: [[String: Any]] = []
if let data = try? Data(contentsOf: output), let saved = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] { result = saved }
for index in 0..<pdf.pageCount where selected.contains(index + 1) && !result.contains(where: { $0["page"] as? Int == index + 1 && (!barcodeOnly || $0["barcodes"] != nil) }) {
    try autoreleasepool {
        guard let page = pdf.page(at: index) else { return }
        let bounds = page.bounds(for: .mediaBox)
        let preview = page.thumbnail(of: NSSize(width: bounds.width * 2, height: bounds.height * 2), for: .mediaBox)
        var rect = CGRect(origin: .zero, size: preview.size)
        guard let image = preview.cgImage(forProposedRect: &rect, context: nil, hints: nil) else { return }
        var saved = result.first(where: { $0["page"] as? Int == index + 1 }) ?? ["page": index + 1]
        if !barcodeOnly {
            let request = VNRecognizeTextRequest()
            request.recognitionLevel = .accurate
            request.recognitionLanguages = ["zh-Hans", "en-US"]
            request.usesLanguageCorrection = true
            try VNImageRequestHandler(cgImage: image).perform([request])
            saved["lines"] = (request.results ?? []).compactMap { observation -> [String: Any]? in
                guard let text = observation.topCandidates(1).first else { return nil }
                let box = observation.boundingBox
                return ["text": text.string, "confidence": text.confidence, "x": box.minX, "y": 1 - box.maxY, "w": box.width, "h": box.height]
            }
        }
        let barcodes = VNDetectBarcodesRequest()
        barcodes.symbologies = [.qr, .aztec, .dataMatrix, .pdf417]
        try VNImageRequestHandler(cgImage: image).perform([barcodes])
        saved["barcodes"] = (barcodes.results ?? []).map { observation -> [String: Double] in
            let box = observation.boundingBox
            return ["x": box.minX, "y": 1 - box.maxY, "w": box.width, "h": box.height]
        }
        result.removeAll(where: { $0["page"] as? Int == index + 1 })
        result.append(saved)
        result.sort { ($0["page"] as? Int ?? 0) < ($1["page"] as? Int ?? 0) }
        try JSONSerialization.data(withJSONObject: result, options: [.prettyPrinted, .sortedKeys]).write(to: output, options: .atomic)
    }
}
print("OCR saved \(result.count)/\(pdf.pageCount) pages: \(output.lastPathComponent)")
