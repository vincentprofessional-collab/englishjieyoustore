import Foundation
import PDFKit
import Vision
import AppKit

let input = FileHandle.standardInput.readDataToEndOfFile()
let jobs = try JSONSerialization.jsonObject(with: input) as! [[String: Any]]
var documents: [String: PDFDocument] = [:]
var output: [[String: Any]] = []
for job in jobs {
    let pageNo = job["page"] as? Int ?? 1
    let image: NSImage
    let bounds: NSRect
    if let path = job["image"] as? String {
        guard let raster = NSImage(contentsOfFile: path) else { fatalError("Cannot read raster") }
        image = raster
        bounds = NSRect(origin: .zero, size: raster.size)
    } else {
        let path = job["pdf"] as! String
        let document = documents[path] ?? PDFDocument(url: URL(fileURLWithPath: path))!
        documents[path] = document
        guard let page = document.page(at: pageNo - 1) else { fatalError("Cannot read PDF page") }
        bounds = page.bounds(for: .mediaBox)
        image = page.thumbnail(of: NSSize(width: 1800, height: 2400), for: .mediaBox)
    }
    guard let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { fatalError("Cannot decode image") }
    let request = VNDetectBarcodesRequest()
    request.symbologies = [.qr]
    request.usesCPUOnly = true
    try VNImageRequestHandler(cgImage: cgImage, options: [:]).perform([request])
    let codes = (request.results ?? []).map { code -> [String: Any] in
        let rect = code.boundingBox
        return ["message": code.payloadStringValue ?? "", "rect": [rect.minX * bounds.width,
            (1 - rect.maxY) * bounds.height, rect.maxX * bounds.width, (1 - rect.minY) * bounds.height]]
    }
    output.append(["book": job["book"] ?? 0, "page": pageNo, "asset": job["image"] ?? "", "codes": codes])
}
let result = try JSONSerialization.data(withJSONObject: output, options: [.prettyPrinted, .sortedKeys])
FileHandle.standardOutput.write(result)
