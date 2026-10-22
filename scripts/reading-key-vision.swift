import Foundation
import Vision
import ImageIO

struct Job: Decodable { let image: String; let output: String; let book: Int; let page: Int }
struct Box: Codable { let text: String; let x: Double; let y: Double; let w: Double; let h: Double; let confidence: Float }
struct Result: Codable { let book: Int; let page: Int; let width: Int; let height: Int; let lines: [Box] }

let jobs = try JSONDecoder().decode([Job].self, from: Data(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1])))
let encoder = JSONEncoder()
encoder.outputFormatting = [.sortedKeys]
for job in jobs {
    if FileManager.default.fileExists(atPath: job.output) { continue }
    try autoreleasepool {
        let url = URL(fileURLWithPath: job.image)
        guard let source = CGImageSourceCreateWithURL(url as CFURL, nil), let cg = CGImageSourceCreateImageAtIndex(source, 0, nil) else { throw NSError(domain: "reading-ocr", code: 1) }
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.recognitionLanguages = ["en-US"]
        request.usesLanguageCorrection = false
        request.minimumTextHeight = 0.002
        let handler = VNImageRequestHandler(cgImage: cg)
        try handler.perform([request])
        let lines = (request.results ?? []).compactMap { item -> Box? in
            guard let text = item.topCandidates(1).first else { return nil }
            let box = item.boundingBox
            return Box(text: text.string, x: box.minX * Double(cg.width), y: (1 - box.maxY) * Double(cg.height), w: box.width * Double(cg.width), h: box.height * Double(cg.height), confidence: text.confidence)
        }
        let result = Result(book: job.book, page: job.page, width: cg.width, height: cg.height, lines: lines)
        try encoder.encode(result).write(to: URL(fileURLWithPath: job.output), options: .atomic)
    }
    print("CI\(job.book) p\(job.page) OCR checkpoint")
    fflush(stdout)
}
