import Foundation
import Vision
import AppKit

// Offline source intake on macOS; coordinates are normalized from the page top.
let barcodeOnly = CommandLine.arguments.contains("--barcodes")
let numbersOnly = CommandLine.arguments.contains("--numbers")
let arguments = CommandLine.arguments.dropFirst().filter { $0 != "--barcodes" && $0 != "--numbers" }
for path in arguments {
    guard let image = NSImage(contentsOfFile: path),
          let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { continue }
    if barcodeOnly {
        let request = VNDetectBarcodesRequest()
        try VNImageRequestHandler(cgImage: cgImage).perform([request])
        let boxes = (request.results ?? []).map { observation -> [String: Double] in
            let box = observation.boundingBox
            return ["x": box.minX, "y": 1 - box.maxY, "w": box.width, "h": box.height]
        }
        let data = try JSONSerialization.data(withJSONObject: ["boxes": boxes], options: [.sortedKeys])
        print(String(data: data, encoding: .utf8)!)
        continue
    }
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.recognitionLanguages = numbersOnly ? ["en-US"] : ["zh-Hans", "en-US"]
    request.automaticallyDetectsLanguage = !numbersOnly
    request.usesLanguageCorrection = !numbersOnly
    try VNImageRequestHandler(cgImage: cgImage).perform([request])
    let lines = (request.results ?? []).compactMap { observation -> [String: Any]? in
        guard let text = observation.topCandidates(1).first else { return nil }
        let box = observation.boundingBox
        return ["text": text.string, "confidence": text.confidence,
                "x": box.minX, "y": 1 - box.maxY, "w": box.width, "h": box.height]
    }
    let output: [String: Any] = ["path": path, "lines": lines]
    let data = try JSONSerialization.data(withJSONObject: output, options: [.sortedKeys])
    print(String(data: data, encoding: .utf8)!)
}
