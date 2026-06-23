use std::io::{BufReader, Cursor};
use std::process::{Child, Command};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::time::Duration;
use rodio::{Decoder, OutputStream, Sink};
use tauri::{Emitter, Manager};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;

static MINI_MODE: AtomicBool = AtomicBool::new(false);

#[tauri::command]
fn play_audio(url: String) -> Result<(), String> {
    std::thread::spawn(move || {
        let bytes = reqwest::blocking::get(&url)
            .and_then(|r| r.bytes())
            .map_err(|e| format!("Failed to fetch audio: {}", e));

        match bytes {
            Ok(data) => {
                let (_stream, stream_handle) = OutputStream::try_default()
                    .expect("Failed to open audio output");
                let sink = Sink::try_new(&stream_handle)
                    .expect("Failed to create audio sink");
                let cursor = Cursor::new(data);
                match Decoder::new(BufReader::new(cursor)) {
                    Ok(source) => {
                        sink.append(source);
                        sink.sleep_until_end();
                    }
                    Err(e) => eprintln!("[audio] Decode error: {}", e),
                }
            }
            Err(e) => eprintln!("[audio] {}", e),
        }
    });
    Ok(())
}

#[tauri::command]
fn toggle_mini_mode(window: tauri::WebviewWindow) -> Result<bool, String> {
    let is_mini = !MINI_MODE.load(Ordering::SeqCst);
    MINI_MODE.store(is_mini, Ordering::SeqCst);

    if is_mini {
        let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize::new(360.0, 520.0)));
    } else {
        let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize::new(1280.0, 800.0)));
    }

    let _ = window.emit("mini-mode-changed", is_mini);
    Ok(is_mini)
}

#[tauri::command]
fn get_mini_mode() -> bool {
    MINI_MODE.load(Ordering::SeqCst)
}

/// Holds managed child processes so we can kill them on exit
struct ManagedProcesses {
    agent: Mutex<Option<Child>>,
    server: Mutex<Option<Child>>,
    voice_agent: Mutex<Option<Child>>,
}

/// Check if a service is healthy by polling a URL
fn check_health(url: &str) -> bool {
    match reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(2))
        .build()
    {
        Ok(client) => client
            .get(url)
            .send()
            .map(|r| r.status().is_success())
            .unwrap_or(false),
        Err(_) => false,
    }
}

/// Gracefully stop a child process: SIGTERM → wait 5s → SIGKILL
fn stop_child(child: &mut Child, name: &str) {
    let pid = child.id();
    println!("[tauri] Sending SIGTERM to {} (PID: {})", name, pid);

    #[cfg(unix)]
    {
        unsafe {
            libc::kill(pid as i32, libc::SIGTERM);
        }
    }

    let start = std::time::Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                println!("[tauri] {} exited with: {}", name, status);
                break;
            }
            Ok(None) => {
                if start.elapsed() > Duration::from_secs(5) {
                    println!("[tauri] {} didn't exit, sending SIGKILL", name);
                    let _ = child.kill();
                    let _ = child.wait();
                    break;
                }
                std::thread::sleep(Duration::from_millis(200));
            }
            Err(e) => {
                eprintln!("[tauri] Error waiting for {}: {}", name, e);
                let _ = child.kill();
                break;
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![play_audio, toggle_mini_mode, get_mini_mode])
        .setup(|app| {
            let handle = app.handle().clone();

            // ── System tray icon ──
            let show_item = MenuItem::with_id(app, "show", "Show My Jarvis", true, None::<&str>)?;
            let mini_item = MenuItem::with_id(app, "mini", "Mini Mode", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &mini_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().cloned().unwrap())
                .tooltip("My Jarvis — Starting...")
                .menu(&menu)
                .on_menu_event(move |app_handle, event| {
                    match event.id().as_ref() {
                        "show" => {
                            if let Some(window) = app_handle.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "mini" => {
                            if let Some(window) = app_handle.get_webview_window("main") {
                                let is_mini = !MINI_MODE.load(Ordering::SeqCst);
                                MINI_MODE.store(is_mini, Ordering::SeqCst);
                                if is_mini {
                                    let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize::new(360.0, 520.0)));
                                } else {
                                    let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize::new(1280.0, 800.0)));
                                }
                                let _ = window.show();
                                let _ = window.set_focus();
                                let _ = window.emit("mini-mode-changed", is_mini);
                            }
                        }
                        "quit" => {
                            app_handle.exit(0);
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            // Resolve resource paths
            let resource_dir = app
                .path()
                .resource_dir()
                .expect("failed to resolve resource dir");

            let node_bin = resource_dir.join("agent-bundle").join("node").join("node");
            let agent_entry = resource_dir
                .join("agent-bundle")
                .join("agent")
                .join("dist")
                .join("cli")
                .join("node.js");
            let server_entry = resource_dir
                .join("agent-bundle")
                .join("server")
                .join("index.js");

            println!("[tauri] Node binary: {}", node_bin.display());
            println!("[tauri] Agent entry: {}", agent_entry.display());
            println!("[tauri] Server entry: {}", server_entry.display());

            // Check if we're in dev mode
            let is_dev = cfg!(debug_assertions);

            if is_dev {
                let agent_ok = check_health("http://localhost:10000/api/health");
                let server_ok = check_health("http://localhost:3001/api/contacts");

                if agent_ok && server_ok {
                    println!("[tauri] Dev mode: both processes already running");
                    let handle_clone = handle.clone();
                    std::thread::spawn(move || {
                        let _ = handle_clone.emit("agent-ready", true);
                    });
                    app.manage(ManagedProcesses {
                        agent: Mutex::new(None),
                        server: Mutex::new(None),
                        voice_agent: Mutex::new(None),
                    });
                    return Ok(());
                }

                if !node_bin.exists() {
                    println!("[tauri] Dev mode: agent-bundle not found, start processes manually");
                    println!("[tauri]   Terminal 1: cd agent && npx tsx cli/node.ts --debug");
                    println!("[tauri]   Terminal 2: API_PORT=3001 npx tsx server/index.ts");
                    println!("[tauri]   Terminal 3: cd voice-agent && uv run python src/agent.py dev");
                    app.manage(ManagedProcesses {
                        agent: Mutex::new(None),
                        server: Mutex::new(None),
                        voice_agent: Mutex::new(None),
                    });
                    return Ok(());
                }
            }

            // Common env setup for macOS GUI apps (minimal PATH)
            let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
            let system_path = std::env::var("PATH").unwrap_or_default();
            let expanded_path = format!(
                "{}:{}/.local/bin:/usr/local/bin:/opt/homebrew/bin:/opt/homebrew/sbin:{}",
                system_path, home, "/usr/bin:/bin:/usr/sbin:/sbin"
            );

            // Log directory
            let log_dir = std::path::PathBuf::from(&home)
                .join("Library")
                .join("Logs")
                .join("My Jarvis");
            let _ = std::fs::create_dir_all(&log_dir);

            // Data directory for SQLite database
            let data_dir = std::path::PathBuf::from(&home)
                .join("Library")
                .join("Application Support")
                .join("My Jarvis");
            let _ = std::fs::create_dir_all(&data_dir);

            // ── Spawn SQLite Express server (:3001) ──
            let server_log = log_dir.join("server.log");
            println!("[tauri] Spawning SQLite server... (log: {})", server_log.display());

            let server_stdout = std::fs::File::create(&server_log)
                .unwrap_or_else(|_| std::fs::File::create("/dev/null").unwrap());
            let server_stderr = server_stdout
                .try_clone()
                .unwrap_or_else(|_| std::fs::File::create("/dev/null").unwrap());

            // The server owns its own config loading (secrets, API keys, etc.)
            // It reads from $DATA_DIR/config.env in production, or <repo>/.env in dev.
            // Rust only passes operational env — no secrets forwarded from the shell.
            let server_child = Command::new(&node_bin)
                .arg(&server_entry)
                .env("API_PORT", "3001")
                .env("DATA_DIR", data_dir.to_str().unwrap_or("/tmp"))
                .env("NODE_ENV", "production")
                .env("HOME", &home)
                .env("PATH", &expanded_path)
                .stdout(server_stdout)
                .stderr(server_stderr)
                .spawn();

            let server_process = match server_child {
                Ok(child) => {
                    println!("[tauri] SQLite server started (PID: {})", child.id());
                    Some(child)
                }
                Err(e) => {
                    eprintln!("[tauri] Failed to spawn SQLite server: {}", e);
                    None
                }
            };

            // ── Spawn Agent sidecar (:10000) ──
            let agent_log = log_dir.join("agent.log");
            println!("[tauri] Spawning agent... (log: {})", agent_log.display());

            let agent_stdout = std::fs::File::create(&agent_log)
                .unwrap_or_else(|_| std::fs::File::create("/dev/null").unwrap());
            let agent_stderr = agent_stdout
                .try_clone()
                .unwrap_or_else(|_| std::fs::File::create("/dev/null").unwrap());

            let agent_child = Command::new(&node_bin)
                .arg(&agent_entry)
                .arg("--port")
                .arg("10000")
                .env("NODE_ENV", "production")
                .env("HOME", &home)
                .env("PATH", &expanded_path)
                .stdout(agent_stdout)
                .stderr(agent_stderr)
                .spawn();

            let agent_process = match agent_child {
                Ok(child) => {
                    println!("[tauri] Agent started (PID: {})", child.id());
                    Some(child)
                }
                Err(e) => {
                    eprintln!("[tauri] Failed to spawn agent: {}", e);
                    let _ = handle.emit("agent-failed", format!("Failed to start agent: {}", e));
                    None
                }
            };

            // ── Spawn Voice Agent (LiveKit Python agent) ──
            let voice_log = log_dir.join("voice-agent.log");
            println!("[tauri] Spawning voice agent... (log: {})", voice_log.display());

            let voice_stdout = std::fs::File::create(&voice_log)
                .unwrap_or_else(|_| std::fs::File::create("/dev/null").unwrap());
            let voice_stderr = voice_stdout
                .try_clone()
                .unwrap_or_else(|_| std::fs::File::create("/dev/null").unwrap());

            // Voice agent lives at <resource_dir>/voice-agent/ in production,
            // or <project_root>/voice-agent/ in dev mode.
            // In production, the Resources dir is read-only, so we copy to
            // Application Support where uv can create a .venv.
            let voice_agent_dir = if is_dev {
                std::env::current_dir()
                    .unwrap_or_else(|_| std::path::PathBuf::from("."))
                    .join("voice-agent")
            } else {
                let bundled_dir = resource_dir.join("voice-agent");
                let writable_dir = data_dir.join("voice-agent");
                // Sync source files from bundle to writable location
                if bundled_dir.join("src").join("agent.py").exists() {
                    let _ = std::fs::create_dir_all(writable_dir.join("src"));
                    // Always copy source + config (they may have changed between builds)
                    for file in &["src/agent.py", "src/__init__.py", "pyproject.toml", "uv.lock", ".env.local"] {
                        let src = bundled_dir.join(file);
                        let dst = writable_dir.join(file);
                        if src.exists() {
                            let _ = std::fs::copy(&src, &dst);
                        }
                    }
                    println!("[tauri] Synced voice agent to {}", writable_dir.display());
                }
                writable_dir
            };

            let voice_process = if voice_agent_dir.join("src").join("agent.py").exists() {
                // Find uv: check common locations, then fall back to PATH lookup
                let uv_candidates = vec![
                    format!("{}/.local/bin/uv", home),
                    "/Library/Frameworks/Python.framework/Versions/3.11/bin/uv".to_string(),
                    "/opt/homebrew/bin/uv".to_string(),
                    "/usr/local/bin/uv".to_string(),
                ];
                let uv_bin = uv_candidates.iter()
                    .find(|p| std::path::Path::new(p).exists())
                    .cloned()
                    .unwrap_or_else(|| "uv".to_string()); // fall back to PATH
                let (cmd, args) = if std::path::Path::new(&uv_bin).exists() {
                    (uv_bin, vec!["run".to_string(), "python".to_string(), "src/agent.py".to_string(), "dev".to_string()])
                } else {
                    let venv_python = voice_agent_dir.join(".venv").join("bin").join("python3");
                    if venv_python.exists() {
                        (venv_python.to_string_lossy().to_string(), vec!["src/agent.py".to_string(), "dev".to_string()])
                    } else {
                        ("python3".to_string(), vec!["src/agent.py".to_string(), "dev".to_string()])
                    }
                };

                println!("[tauri] Voice agent command: {} {:?}", cmd, args);

                match Command::new(&cmd)
                    .args(&args)
                    .current_dir(&voice_agent_dir)
                    .env("HOME", &home)
                    .env("PATH", &expanded_path)
                    .stdout(voice_stdout)
                    .stderr(voice_stderr)
                    .spawn()
                {
                    Ok(child) => {
                        println!("[tauri] Voice agent started (PID: {})", child.id());
                        Some(child)
                    }
                    Err(e) => {
                        eprintln!("[tauri] Failed to spawn voice agent: {}", e);
                        None
                    }
                }
            } else {
                println!("[tauri] Voice agent not found at {:?}, skipping", voice_agent_dir);
                None
            };

            app.manage(ManagedProcesses {
                agent: Mutex::new(agent_process),
                server: Mutex::new(server_process),
                voice_agent: Mutex::new(voice_process),
            });

            // ── Health check + watchdog loop for both processes ──
            std::thread::spawn(move || {
                let max_attempts = 30;
                let mut server_ready = false;
                let mut agent_ready = false;

                for attempt in 1..=max_attempts {
                    std::thread::sleep(Duration::from_secs(1));

                    if !server_ready && check_health("http://localhost:3001/api/contacts") {
                        println!("[tauri] SQLite server healthy (attempt {})", attempt);
                        server_ready = true;
                    }

                    if !agent_ready && check_health("http://localhost:10000/api/health") {
                        println!("[tauri] Agent healthy (attempt {})", attempt);
                        agent_ready = true;
                    }

                    if server_ready && agent_ready {
                        println!("[tauri] Both processes healthy after {} second(s)", attempt);
                        let _ = handle.emit("agent-ready", true);
                        // Update tray tooltip
                        if let Some(tray) = handle.tray_by_id("main") {
                            let _ = tray.set_tooltip(Some("My Jarvis — Running"));
                        }
                        return;
                    }

                    if attempt % 5 == 0 {
                        println!(
                            "[tauri] Waiting... server={}, agent={} ({}/{})",
                            if server_ready { "ok" } else { "pending" },
                            if agent_ready { "ok" } else { "pending" },
                            attempt,
                            max_attempts
                        );
                    }
                }

                eprintln!("[tauri] Processes failed to start within {} seconds", max_attempts);
                let _ = handle.emit(
                    "agent-failed",
                    format!(
                        "Startup timeout: server={}, agent={}",
                        if server_ready { "ok" } else { "failed" },
                        if agent_ready { "ok" } else { "failed" }
                    ),
                );
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        if let tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit = event {
            if let Some(state) = app_handle.try_state::<ManagedProcesses>() {
                // Stop voice agent
                if let Ok(mut guard) = state.voice_agent.lock() {
                    if let Some(ref mut child) = *guard {
                        stop_child(child, "voice agent");
                    }
                }
                // Stop agent
                if let Ok(mut guard) = state.agent.lock() {
                    if let Some(ref mut child) = *guard {
                        stop_child(child, "agent");
                    }
                }
                // Stop SQLite server
                if let Ok(mut guard) = state.server.lock() {
                    if let Some(ref mut child) = *guard {
                        stop_child(child, "SQLite server");
                    }
                }
            }
        }
    });
}
