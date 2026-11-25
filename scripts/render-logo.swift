import AppKit
let source = CommandLine.arguments[1]
let output = CommandLine.arguments[2]
guard let image = NSImage(contentsOfFile: source) else { fatalError("Cannot load SVG") }
let size = NSSize(width: 1024, height: 1024)
let canvas = NSRect(origin: .zero, size: size)
let inset: CGFloat = CommandLine.arguments.contains("--macos-dock") ? 97 : 0
let artwork = canvas.insetBy(dx: inset, dy: inset)
let cornerRadius = 200 * artwork.width / canvas.width
guard let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: 1024, pixelsHigh: 1024, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0), let context = NSGraphicsContext(bitmapImageRep: bitmap) else { fatalError("Cannot create bitmap") }
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context
context.imageInterpolation = .high
// Match the website's rounded tile while preserving the SVG's artwork.
NSBezierPath(roundedRect: artwork, xRadius: cornerRadius, yRadius: cornerRadius).addClip()
image.draw(in: artwork, from: .zero, operation: .sourceOver, fraction: 1)
NSGraphicsContext.restoreGraphicsState()
guard let data = bitmap.representation(using: .png, properties: [:]) else { fatalError("Cannot create PNG") }
try data.write(to: URL(fileURLWithPath: output))
