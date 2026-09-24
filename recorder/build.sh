#!/bin/bash
# Builds MeetingRecorder.app — a bundle, not a bare binary, because macOS only asks for
# microphone and system-audio permission for something with an Info.plist naming why.
set -euo pipefail
cd "$(dirname "$0")"
APP=build/MeetingRecorder.app
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS"
swiftc -O -o "$APP/Contents/MacOS/meeting-recorder" MeetingRecorder.swift
cp Info.plist "$APP/Contents/Info.plist"
codesign --force --sign - "$APP"
echo "built $APP"
