// meeting-recorder — records a meeting as two tracks, whatever app the meeting is in.
//
//   mic    = the default input device (Erez)
//   system = everything the Mac plays, via a Core Audio process tap (macOS 14.2+)
//            — Teams, Meet in Chrome, Zoom alike; the output device does not matter,
//            so speakers, AirPods and wired earphones all work.
//
// Usage:  meeting-recorder <out-dir> [max-chunk-seconds=12]
//
// Writes 16 kHz mono 16-bit WAV chunks, ONE PER SPOKEN SENTENCE: a chunk closes
// the moment the speaker pauses (0.5 s of quiet after speech), so a line can be
// transcribed and shown about a second after it is said (Erez, 6 Oct: "as fast as
// whisper can do it, but still precise"). Someone who never pauses is cut at the
// cap, at the quietest 100 ms of its last 4 s. Long silence is dropped, not written.
// It and appends one JSON line per chunk to
// <out-dir>/chunks.jsonl AFTER the file is renamed into place — a reader that
// follows chunks.jsonl never sees a half-written file.
// SIGINT/SIGTERM flushes both tracks and writes <out-dir>/done.

import AVFoundation
import CoreAudio
import Foundation

let SR: Double = 16_000
let args = CommandLine.arguments
guard args.count >= 2 else {
    FileHandle.standardError.write("usage: meeting-recorder <out-dir> [chunk-seconds]\n".data(using: .utf8)!)
    exit(2)
}
let outDir = URL(fileURLWithPath: args[1])
let chunkSeconds = args.count >= 3 ? Double(args[2]) ?? 12 : 12   // the cap, not the rhythm
try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)
let startedAt = Date()
let targetFormat = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: SR, channels: 1, interleaved: false)!
let journalLock = NSLock()

func log(_ s: String) {
    let t = String(format: "%6.2f", Date().timeIntervalSince(startedAt))
    FileHandle.standardError.write("[recorder +\(t)s] \(s)\n".data(using: .utf8)!)
}

func appendJournal(_ obj: [String: Any]) {
    journalLock.lock(); defer { journalLock.unlock() }
    let url = outDir.appendingPathComponent("chunks.jsonl")
    var line = try! JSONSerialization.data(withJSONObject: obj, options: [.sortedKeys])
    line.append(0x0A)
    if let h = try? FileHandle(forWritingTo: url) {
        h.seekToEndOfFile(); h.write(line); try? h.close()
    } else {
        try? line.write(to: url)
    }
}

func writeWav(_ samples: ArraySlice<Float>, to url: URL) throws {
    var d = Data()
    func u32(_ v: UInt32) { var x = v.littleEndian; d.append(Data(bytes: &x, count: 4)) }
    func u16(_ v: UInt16) { var x = v.littleEndian; d.append(Data(bytes: &x, count: 2)) }
    let bytes = UInt32(samples.count * 2)
    d.append("RIFF".data(using: .ascii)!); u32(36 + bytes)
    d.append("WAVEfmt ".data(using: .ascii)!); u32(16); u16(1); u16(1)
    u32(UInt32(SR)); u32(UInt32(SR) * 2); u16(2); u16(16)
    d.append("data".data(using: .ascii)!); u32(bytes)
    d.reserveCapacity(d.count + samples.count * 2)
    for s in samples {
        var v = Int16(max(-1, min(1, s)) * 32767).littleEndian
        d.append(Data(bytes: &v, count: 2))
    }
    try d.write(to: url)
}

/// One track: converts whatever arrives to 16 kHz mono and cuts chunks.
final class Track {
    let name: String
    let lock = NSLock()
    var converter: AVAudioConverter?
    var sourceFormat: AVAudioFormat?
    var buf: [Float] = []
    var offset = 0          // samples already written out, from recording start
    var index = 0

    init(_ name: String) { self.name = name }

    func append(_ input: AVAudioPCMBuffer) {
        lock.lock(); defer { lock.unlock() }
        if sourceFormat != input.format {
            sourceFormat = input.format
            converter = AVAudioConverter(from: input.format, to: targetFormat)
            log("\(name): source format \(input.format)")
        }
        guard let conv = converter else { return }
        let cap = AVAudioFrameCount(Double(input.frameLength) * SR / input.format.sampleRate) + 64
        guard let out = AVAudioPCMBuffer(pcmFormat: targetFormat, frameCapacity: cap) else { return }
        var fed = false
        var err: NSError?
        conv.convert(to: out, error: &err) { _, status in
            if fed { status.pointee = .noDataNow; return nil }
            fed = true; status.pointee = .haveData; return input
        }
        if let err { log("\(name): convert error \(err)"); return }
        if out.frameLength > 0, let ch = out.floatChannelData?[0] {
            buf.append(contentsOf: UnsafeBufferPointer(start: ch, count: Int(out.frameLength)))
        }
        lastAudio = Date()
        scan()
    }

    // ── Pause detection: plain energy on 30 ms frames against an adaptive floor ──
    let frame = Int(0.03 * SR)
    var scanned = 0              // samples of buf already classified
    var floor: Float = 0.002     // running noise floor (rises slowly, falls at once)
    var heardSpeech = false      // speech since the last cut
    var silentRun = 0            // samples of quiet since the last speech frame
    var lastAudio = Date()

    func scan() {
        while scanned + frame <= buf.count {
            var sq: Float = 0
            for j in scanned..<(scanned + frame) { sq += buf[j] * buf[j] }
            let rms = (sq / Float(frame)).squareRoot()
            floor = rms < floor ? rms : floor + (rms - floor) * 0.002
            let speech = rms > max(0.004, floor * 3)
            scanned += frame
            if speech { heardSpeech = true; silentRun = 0 } else { silentRun += frame }

            if heardSpeech && silentRun >= Int(0.5 * SR) && scanned >= Int(1.0 * SR) {
                // The sentence ended: cut 0.25 s into the pause, keeping a little tail.
                cut(at: scanned - silentRun + Int(0.25 * SR))
            } else if !heardSpeech && buf.count >= Int(10 * SR) {
                drop(Int(10 * SR) - Int(1 * SR))     // ten seconds of nothing: discard, keep 1 s lead-in
            } else if buf.count >= Int(chunkSeconds * SR) {
                cut(at: quietestCut(target: buf.count))
            }
        }
    }

    /// Advance past audio nobody needs (silence), keeping timestamps true.
    func drop(_ n: Int) {
        offset += n
        buf.removeFirst(n)
        scanned = max(0, scanned - n)
    }

    /// The quietest 100 ms in the last 4 s before the target, so a cut rarely splits a word.
    func quietestCut(target: Int) -> Int {
        let win = Int(0.1 * SR), lo = max(win, target - Int(4 * SR))
        var best = target, bestE = Float.greatestFiniteMagnitude
        var i = lo
        while i + win <= target {
            var e: Float = 0
            for j in i..<(i + win) { e += buf[j] * buf[j] }
            if e < bestE { bestE = e; best = i + win / 2 }
            i += win / 2
        }
        return best
    }

    func cut(at n: Int) {
        guard n > 0 else { return }
        let slice = buf[0..<n]
        var sq: Float = 0
        for s in slice { sq += s * s }
        let rms = (sq / Float(n)).squareRoot()
        index += 1
        let file = String(format: "%@-%06d.wav", name, index)
        let tmp = outDir.appendingPathComponent(file + ".tmp")
        let dst = outDir.appendingPathComponent(file)
        do {
            try writeWav(slice, to: tmp)
            try FileManager.default.moveItem(at: tmp, to: dst)
            appendJournal([
                "track": name, "index": index, "file": file,
                "start_s": Double(offset) / SR, "dur_s": Double(n) / SR,
                "rms": Double(rms), "wall": Date().timeIntervalSince1970,
            ])
            log(String(format: "%@ chunk %d  %.1fs  rms=%.4f", name, index, Double(n) / SR, rms))
        } catch { log("\(name): write failed \(error)") }
        offset += n
        buf.removeFirst(n)
        scanned = max(0, scanned - n)
        heardSpeech = false
        silentRun = 0
    }

    func flush() {
        lock.lock(); defer { lock.unlock() }
        if heardSpeech && buf.count > Int(0.5 * SR) { cut(at: buf.count) }
    }
}

let mic = Track("mic")
let sys = Track("system")

// ── mic: AVAudioEngine on the default input; rebuilt when the device changes ──
let engine = AVAudioEngine()
func startMic() {
    let input = engine.inputNode
    input.removeTap(onBus: 0)
    let fmt = input.outputFormat(forBus: 0)
    guard fmt.sampleRate > 0 else { log("mic: no input device"); return }
    input.installTap(onBus: 0, bufferSize: 4096, format: fmt) { b, _ in mic.append(b) }
    do { try engine.start(); log("mic: started \(fmt)") } catch { log("mic: start failed \(error)") }
}
NotificationCenter.default.addObserver(forName: .AVAudioEngineConfigurationChange, object: engine, queue: nil) { _ in
    log("mic: device changed — restarting")
    engine.stop(); startMic()
}

// ── system: a global process tap wrapped in a private aggregate device ──
func prop<T>(_ obj: AudioObjectID, _ sel: AudioObjectPropertySelector, _ def: T) -> T {
    var addr = AudioObjectPropertyAddress(mSelector: sel, mScope: kAudioObjectPropertyScopeGlobal, mElement: kAudioObjectPropertyElementMain)
    var size = UInt32(MemoryLayout<T>.size)
    var v = def
    let st = AudioObjectGetPropertyData(obj, &addr, 0, nil, &size, &v)
    return st == noErr ? v : def
}

var tapID = AudioObjectID(kAudioObjectUnknown)
var aggID = AudioObjectID(kAudioObjectUnknown)
var procID: AudioDeviceIOProcID?
let ioQueue = DispatchQueue(label: "recorder.system", qos: .userInitiated)

func startSystem() -> Bool {
    let desc = CATapDescription(stereoGlobalTapButExcludeProcesses: [])
    desc.uuid = UUID()
    desc.muteBehavior = .unmuted
    desc.isPrivate = true
    var st = AudioHardwareCreateProcessTap(desc, &tapID)
    guard st == noErr else { log("system: create tap failed \(st)"); return false }

    var asbd: AudioStreamBasicDescription = prop(tapID, kAudioTapPropertyFormat, AudioStreamBasicDescription())
    guard let tapFormat = AVAudioFormat(streamDescription: &asbd) else { log("system: bad tap format"); return false }

    let outDev: AudioObjectID = prop(AudioObjectID(kAudioObjectSystemObject), kAudioHardwarePropertyDefaultSystemOutputDevice, AudioObjectID(0))
    let outUID: CFString = prop(outDev, kAudioDevicePropertyDeviceUID, "" as CFString)
    let agg: [String: Any] = [
        kAudioAggregateDeviceNameKey: "MyJarvis Meeting Tap",
        kAudioAggregateDeviceUIDKey: UUID().uuidString,
        kAudioAggregateDeviceMainSubDeviceKey: outUID as String,
        kAudioAggregateDeviceIsPrivateKey: true,
        kAudioAggregateDeviceIsStackedKey: false,
        kAudioAggregateDeviceTapAutoStartKey: true,
        kAudioAggregateDeviceSubDeviceListKey: [[kAudioSubDeviceUIDKey: outUID as String]],
        kAudioAggregateDeviceTapListKey: [[kAudioSubTapDriftCompensationKey: true,
                                           kAudioSubTapUIDKey: desc.uuid.uuidString]],
    ]
    st = AudioHardwareCreateAggregateDevice(agg as CFDictionary, &aggID)
    guard st == noErr else { log("system: create aggregate failed \(st)"); return false }

    st = AudioDeviceCreateIOProcIDWithBlock(&procID, aggID, ioQueue) { _, inData, _, _, _ in
        guard let b = AVAudioPCMBuffer(pcmFormat: tapFormat, bufferListNoCopy: inData, deallocator: nil) else { return }
        sys.append(b)
    }
    guard st == noErr, let procID else { log("system: ioproc failed \(st)"); return false }
    st = AudioDeviceStart(aggID, procID)
    guard st == noErr else { log("system: start failed \(st)"); return false }
    sys.lock.lock(); sys.lastAudio = Date(); sys.lock.unlock()   // the watchdog counts from now
    log("system: started \(tapFormat) via output \(outUID)")
    return true
}

func stopSystem() {
    if let procID { AudioDeviceStop(aggID, procID); AudioDeviceDestroyIOProcID(aggID, procID) }
    if aggID != kAudioObjectUnknown { AudioHardwareDestroyAggregateDevice(aggID) }
    if tapID != kAudioObjectUnknown { AudioHardwareDestroyProcessTap(tapID) }
    procID = nil; aggID = AudioObjectID(kAudioObjectUnknown); tapID = AudioObjectID(kAudioObjectUnknown)
}

// ⛔ The aggregate device is built on the output device that was current at start.
// Switch to headphones and that device goes away — the tap stops delivering and the
// other side vanishes from the transcript (meeting 110, 6 Oct: silent from 9:44 on,
// while the mic, which already restarted itself, carried on). So: rebuild the tap
// when the default output changes, and as a backstop whenever it has delivered
// nothing for 3 s (a running tap delivers silence, never nothing).
var lastSystemRestart = Date.distantPast
func restartSystem(_ why: String) {
    guard Date().timeIntervalSince(lastSystemRestart) > 2 else { return }
    lastSystemRestart = Date()
    log("system: \(why) — restarting tap")
    stopSystem()
    sys.lock.lock(); sys.lastAudio = Date(); sys.lock.unlock()
    if !startSystem() { log("system: restart failed — will retry") }
}
for sel in [kAudioHardwarePropertyDefaultOutputDevice, kAudioHardwarePropertyDefaultSystemOutputDevice] {
    var addr = AudioObjectPropertyAddress(mSelector: sel, mScope: kAudioObjectPropertyScopeGlobal, mElement: kAudioObjectPropertyElementMain)
    AudioObjectAddPropertyListenerBlock(AudioObjectID(kAudioObjectSystemObject), &addr, DispatchQueue.main) { _, _ in
        restartSystem("output device changed")
    }
}
let systemWatchdog = DispatchSource.makeTimerSource(queue: .main)
systemWatchdog.schedule(deadline: .now() + 5, repeating: 1)
systemWatchdog.setEventHandler {
    sys.lock.lock(); let quiet = Date().timeIntervalSince(sys.lastAudio); sys.lock.unlock()
    if quiet > 3 { restartSystem(String(format: "no audio for %.0f s", quiet)) }
}

func finish() {
    engine.stop()
    stopSystem()
    mic.flush(); sys.flush()
    let meta: [String: Any] = ["started": startedAt.timeIntervalSince1970, "ended": Date().timeIntervalSince1970]
    try? JSONSerialization.data(withJSONObject: meta).write(to: outDir.appendingPathComponent("done"))
    log("stopped")
    exit(0)
}

var signalSources: [DispatchSourceSignal] = []
for s in [SIGINT, SIGTERM] {
    signal(s, SIG_IGN)
    let src = DispatchSource.makeSignalSource(signal: s, queue: .main)
    src.setEventHandler { finish() }
    src.resume()
    signalSources.append(src)
}

try? JSONSerialization.data(withJSONObject: ["started": startedAt.timeIntervalSince1970, "chunk_s": chunkSeconds, "pid": getpid()])
    .write(to: outDir.appendingPathComponent("started"))
startMic()
if !startSystem() { log("system track unavailable — the watchdog will keep retrying") }
systemWatchdog.resume()
dispatchMain()
